/**
 * Corrección: inventarios activos que apuntan a un variantId MUERTO.
 *
 * Contexto: las variantes de varios productos del padre broas fueron re-creadas con
 * _id nuevos (al editarse el producto), dejando docs de inventario "colgados" de una
 * variante que ya no existe. La reparación 2026-06-26-reactivate-orphaned-inventory
 * los reactivó por productId sin validar el variantId → al crear el usuario el doc de
 * la variante viva, aparecieron DUPLICADOS (mismo SKU, variantId distinto).
 *
 * Fix (idempotente, reversible) por cada doc ACTIVO cuyo variantId NO está entre las
 * variantes vivas del producto:
 *   - si YA existe un doc para la variante viva → DEACTIVAR el doc muerto (duplicado).
 *   - si NO existe doc para la variante viva → RE-APUNTAR (adoptar) el doc muerto a la
 *     variante viva (variantId/variantSku/productName/productSku desde el producto).
 *   - producto sin variantes vivas, o doc sin variantId → se ignora.
 *
 * DRY-RUN por defecto. Escribe SOLO con --apply. Backup JSON antes de escribir.
 *
 * Uso:
 *   ... npx ts-node -r dotenv/config scripts/migrations/2026-06-26-fix-dead-variant-inventory.ts            # dry-run
 *   ... --apply   [--tenant=<id>]
 */
import { MongoClient, ObjectId } from "mongodb";
import * as fs from "fs";
import * as path from "path";

const DEFAULT_TENANT = "69b187062339e815ceba7487";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : undefined;
}
function forms(id: string): any[] {
  const f: any[] = [id];
  try {
    f.push(new ObjectId(id));
  } catch {
    /* */
  }
  return f;
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const APPLY = process.argv.includes("--apply");
  const TENANT = arg("tenant") || DEFAULT_TENANT;
  const SKUS = arg("skus")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const skuFilter = (sku: string) => !SKUS || SKUS.includes(sku);

  const client = await MongoClient.connect(uri);
  try {
    const db = client.db();
    const Products = db.collection("products");
    const Inventories = db.collection("inventories");
    const tFilter = { tenantId: { $in: forms(TENANT) } };

    // Mapa productId(str) -> { liveVariantIds:Set, product }
    const products = await Products.find({
      ...tFilter,
      isDeleted: { $ne: true },
    })
      .project({ _id: 1, sku: 1, name: 1, variants: 1 })
      .toArray();
    const byProduct = new Map<string, any>();
    for (const p of products) {
      byProduct.set(p._id.toString(), {
        product: p,
        live: new Set((p.variants || []).map((v: any) => v._id.toString())),
      });
    }

    // Docs activos del tenant con variantId
    const invs = await Inventories.find({
      ...tFilter,
      isActive: { $ne: false },
      isDeleted: { $ne: true },
      variantId: { $exists: true, $ne: null },
    }).toArray();

    const deactivate: any[] = [];
    const repoint: any[] = [];
    const reactivateLive: any[] = [];

    for (const i of invs) {
      const pid = (i.productId ?? "").toString();
      const entry = byProduct.get(pid);
      if (!entry) continue; // productId no resuelve a un producto del tenant
      if (!skuFilter(i.productSku)) continue; // fuera del scope --skus
      if (entry.live.size === 0) continue; // producto sin variantes vivas
      if (entry.live.has(i.variantId.toString())) continue; // variante viva → ok

      // variantId muerto. ¿Hay ya un doc ACTIVO (y no borrado) para una variante viva?
      const liveIds = [...entry.live].map((s: string) => new ObjectId(s));
      const activeLive = await Inventories.findOne({
        ...tFilter,
        productId: i.productId,
        variantId: { $in: liveIds },
        isActive: { $ne: false },
        isDeleted: { $ne: true },
      });
      if (activeLive) {
        // ya hay un doc bueno para la variante viva → el muerto es duplicado
        deactivate.push({
          inv: i._id,
          sku: i.productSku,
          existingLive: activeLive._id,
        });
      } else {
        // ¿hay un doc para la variante viva pero INACTIVO/borrado? entonces
        // re-apuntar el muerto colisionaría con el índice único: mejor reactivar ese.
        const liveAny = await Inventories.findOne({
          ...tFilter,
          productId: i.productId,
          variantId: { $in: liveIds },
        });
        if (liveAny) {
          reactivateLive.push({
            inv: liveAny._id,
            dead: i._id,
            sku: i.productSku,
          });
          continue;
        }
        // adoptar a la variante viva que COINCIDE por SKU con el doc muerto
        // (clave en productos multi-variante); si no hay match, a la primera viva
        // (caso producto de una sola variante).
        const liveVariants = entry.product.variants.filter((x: any) =>
          entry.live.has(x._id.toString()),
        );
        const v =
          (i.variantSku &&
            liveVariants.find((x: any) => x.sku === i.variantSku)) ||
          liveVariants[0];
        repoint.push({
          inv: i._id,
          sku: i.productSku,
          toVariantId: v._id,
          toVariantSku: v.sku,
          productName: entry.product.name,
          productSku: entry.product.sku,
        });
      }
    }

    console.log(`Tenant: ${TENANT} | modo: ${APPLY ? "APPLY" : "DRY-RUN"}`);
    console.log(
      `Docs activos con variante MUERTA: ${deactivate.length + repoint.length + reactivateLive.length}`,
    );
    console.log(
      `  → DEACTIVAR (ya hay doc activo de variante viva): ${deactivate.length}`,
    );
    deactivate.forEach((d) =>
      console.log(`     ${d.sku} inv=${d.inv} (vive=${d.existingLive})`),
    );
    console.log(`  → RE-APUNTAR a variante viva: ${repoint.length}`);
    repoint.forEach((r) =>
      console.log(`     ${r.sku} inv=${r.inv} -> variant ${r.toVariantId}`),
    );
    console.log(
      `  → REACTIVAR doc de variante viva (inactivo) + deactivar muerto: ${reactivateLive.length}`,
    );
    reactivateLive.forEach((r) =>
      console.log(`     ${r.sku} reactiva=${r.inv} deactiva=${r.dead}`),
    );

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = path.join(__dirname, "_backups");
    fs.mkdirSync(dir, { recursive: true });
    const bk = path.join(
      dir,
      `fix-dead-variant-inventory-${TENANT}-${stamp}.json`,
    );
    fs.writeFileSync(
      bk,
      JSON.stringify(
        {
          deactivate: deactivate.map((d) => ({
            inv: d.inv.toString(),
            sku: d.sku,
          })),
          repoint: repoint.map((r) => ({
            inv: r.inv.toString(),
            sku: r.sku,
            toVariantId: r.toVariantId.toString(),
          })),
          reactivateLive: reactivateLive.map((r) => ({
            inv: r.inv.toString(),
            dead: r.dead.toString(),
            sku: r.sku,
          })),
        },
        null,
        2,
      ),
    );
    console.log(`Backup: ${bk}`);

    if (!APPLY) {
      console.log("\nDRY-RUN: no se escribió nada. Re-correr con --apply.");
      return;
    }

    let deac = 0;
    for (const d of deactivate) {
      const r = await Inventories.updateOne(
        { _id: d.inv },
        { $set: { isActive: false, updatedAt: new Date() } },
      );
      deac += r.modifiedCount;
    }
    let rep = 0;
    for (const r of repoint) {
      const res = await Inventories.updateOne(
        { _id: r.inv },
        {
          $set: {
            variantId: r.toVariantId,
            variantSku: r.toVariantSku,
            productName: r.productName,
            productSku: r.productSku,
            updatedAt: new Date(),
          },
        },
      );
      rep += res.modifiedCount;
    }
    let react = 0;
    for (const r of reactivateLive) {
      await Inventories.updateOne(
        { _id: r.inv },
        { $set: { isActive: true, isDeleted: false, updatedAt: new Date() } },
      );
      await Inventories.updateOne(
        { _id: r.dead },
        { $set: { isActive: false, updatedAt: new Date() } },
      );
      react++;
    }
    console.log(
      `\nAPPLY hecho: deactivados=${deac}, re-apuntados=${rep}, reactivados-vivos=${react}`,
    );
  } finally {
    await client.close();
  }
}

run().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
