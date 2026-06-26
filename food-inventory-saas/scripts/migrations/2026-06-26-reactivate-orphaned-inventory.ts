/**
 * Migración (reparación): reactivar inventarios huérfanos-inactivos.
 *
 * Contexto: en el grupo broas, productos del catálogo no aparecían en la pantalla
 * de Inventario. La pantalla lista `inventories` con filtro `isActive: { $ne: false }`.
 * Una migración del 2026-05-05 apagó en lote ~415 docs (updatedBy=null) y el botón
 * "Eliminar" (DELETE /inventory/:id → inventory.remove()) pone isActive=false + qty=0.
 * Resultado: productos activos que quedaron SIN ningún documento de inventario activo
 * (ej. TBS-0378), invisibles en Inventario aunque siguen en el catálogo.
 *
 * Fix (idempotente, reversible): por cada producto ACTIVO del tenant que no tenga
 * NINGÚN inventario activo:
 *   - si existe un doc inactivo para ese productId → se REACTIVA (isActive=true,
 *     isDeleted=false), preservando totalQuantity actual (no se inventan cantidades).
 *   - si no existe ningún doc → se crea uno por variante en el warehouse default, qty 0
 *     (mismo shape que InventoryService.createInitialInventoriesForProductInGroup).
 * NO toca productos que ya tienen un inventario activo (los duplicados inactivos
 * String/ObjectId se atacan en otra rebanada).
 *
 * Seguridad:
 *   - DRY-RUN por defecto. Escribe SOLO con --apply.
 *   - Backup de los _id afectados (y docs a crear) a JSON antes de escribir.
 *   - Scope a un tenant (default: padre broas). Override con --tenant=<id>.
 *
 * Uso:
 *   MONGODB_URI=... npx ts-node -r dotenv/config scripts/migrations/2026-06-26-reactivate-orphaned-inventory.ts          # dry-run
 *   MONGODB_URI=... npx ts-node -r dotenv/config scripts/migrations/2026-06-26-reactivate-orphaned-inventory.ts --apply  # aplica
 *   ... --tenant=69b187062339e815ceba7487
 */
import { MongoClient, ObjectId } from "mongodb";
import * as fs from "fs";
import * as path from "path";

const DEFAULT_TENANT = "69b187062339e815ceba7487"; // Tiendas Broas, C.A. (padre)

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : undefined;
}

function tenantForms(id: string): any[] {
  const forms: any[] = [id];
  try {
    forms.push(new ObjectId(id));
  } catch {
    /* not an oid */
  }
  return forms;
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const APPLY = process.argv.includes("--apply");
  const TENANT = arg("tenant") || DEFAULT_TENANT;

  const client = await MongoClient.connect(uri);
  try {
    const db = client.db();
    const Products = db.collection("products");
    const Inventories = db.collection("inventories");
    const Warehouses = db.collection("warehouses");

    const tFilter = { tenantId: { $in: tenantForms(TENANT) } };

    // 1) Productos activos del tenant
    const products = await Products.find({
      ...tFilter,
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    })
      .project({ _id: 1, sku: 1, name: 1, variants: 1 })
      .toArray();

    // 2) Inventarios del tenant → quién tiene activo / inactivos por productId
    const invs = await Inventories.find(tFilter)
      .project({
        _id: 1,
        productId: 1,
        isActive: 1,
        isDeleted: 1,
        totalQuantity: 1,
        updatedAt: 1,
      })
      .toArray();

    const hasActive = new Set<string>();
    const inactiveByProduct = new Map<string, any[]>();
    for (const i of invs) {
      const pid = (i.productId ?? "").toString();
      const isActive = i.isActive !== false && i.isDeleted !== true;
      if (isActive) {
        hasActive.add(pid);
      } else {
        const list = inactiveByProduct.get(pid) || [];
        list.push(i);
        inactiveByProduct.set(pid, list);
      }
    }

    // 3) Warehouse default (igual que InventoryService.getDefaultWarehouse)
    const wh =
      (await Warehouses.findOne({
        ...tFilter,
        isDefault: true,
        isActive: true,
        isDeleted: false,
      })) ||
      (await Warehouses.findOne({
        ...tFilter,
        isActive: true,
        isDeleted: false,
      }));
    const warehouseId: ObjectId | undefined = wh?._id;

    // 4) Clasificar acciones
    const toReactivate: { invId: any; productId: string; sku: string }[] = [];
    const toCreate: { product: any; reason: string }[] = [];
    let alreadyOk = 0;

    for (const p of products) {
      const pid = p._id.toString();
      if (hasActive.has(pid)) {
        alreadyOk++;
        continue;
      }
      const inactives = inactiveByProduct.get(pid);
      if (inactives && inactives.length > 0) {
        // el más reciente por updatedAt
        inactives.sort(
          (a, b) =>
            new Date(b.updatedAt || 0).getTime() -
            new Date(a.updatedAt || 0).getTime(),
        );
        toReactivate.push({
          invId: inactives[0]._id,
          productId: pid,
          sku: p.sku,
        });
      } else {
        toCreate.push({ product: p, reason: "sin ningún doc de inventario" });
      }
    }

    console.log(`Tenant: ${TENANT}`);
    console.log(`Modo: ${APPLY ? "APPLY (escribe)" : "DRY-RUN (no escribe)"}`);
    console.log(`Warehouse default: ${warehouseId ?? "(NINGUNO usable)"}`);
    console.log(
      `Productos activos: ${products.length} | ya con inventario activo: ${alreadyOk}`,
    );
    console.log(`A REACTIVAR (doc inactivo existente): ${toReactivate.length}`);
    console.log(`A CREAR (sin doc): ${toCreate.length}`);
    if (toCreate.length > 0 && !warehouseId) {
      console.error(
        "ABORT: hay productos sin doc pero el tenant no tiene warehouse usable.",
      );
      process.exit(1);
    }

    // Backup
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(__dirname, "_backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(
      backupDir,
      `reactivate-orphaned-inventory-${TENANT}-${stamp}.json`,
    );
    fs.writeFileSync(
      backupPath,
      JSON.stringify(
        {
          tenant: TENANT,
          warehouseId: warehouseId?.toString(),
          reactivate: toReactivate.map((r) => ({
            invId: r.invId.toString(),
            productId: r.productId,
            sku: r.sku,
          })),
          create: toCreate.map((c) => ({
            productId: c.product._id.toString(),
            sku: c.product.sku,
          })),
        },
        null,
        2,
      ),
    );
    console.log(`Backup de afectados: ${backupPath}`);

    if (!APPLY) {
      console.log(
        "\nDRY-RUN: no se escribió nada. Re-correr con --apply para aplicar.",
      );
      return;
    }

    // 5) Aplicar — reactivar
    let reactivated = 0;
    for (const r of toReactivate) {
      const res = await Inventories.updateOne(
        { _id: r.invId },
        { $set: { isActive: true, isDeleted: false, updatedAt: new Date() } },
      );
      reactivated += res.modifiedCount;
    }

    // 6) Aplicar — crear (qty 0, por variante; shape espejo del hook)
    let created = 0;
    for (const c of toCreate) {
      const p = c.product;
      const variants =
        Array.isArray(p.variants) && p.variants.length > 0
          ? p.variants
          : [null];
      for (const v of variants) {
        const doc: any = {
          tenantId: new ObjectId(TENANT),
          warehouseId,
          productId: new ObjectId(p._id.toString()),
          productSku: p.sku,
          productName: p.name,
          totalQuantity: 0,
          availableQuantity: 0,
          reservedQuantity: 0,
          committedQuantity: 0,
          averageCostPrice: v?.costPrice ?? 0,
          lastCostPrice: v?.costPrice ?? 0,
          lots: [],
          alerts: {
            lowStock: false,
            nearExpiration: false,
            expired: false,
            overstock: false,
          },
          metrics: {
            turnoverRate: 0,
            daysOnHand: 0,
            averageDailySales: 0,
            seasonalityFactor: 1,
          },
          isActive: true,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        if (v?._id) doc.variantId = new ObjectId(v._id.toString());
        if (v?.sku) doc.variantSku = v.sku;
        await Inventories.insertOne(doc);
        created++;
      }
    }

    console.log(
      `\nAPPLY hecho: reactivados=${reactivated}, creados=${created}`,
    );
  } finally {
    await client.close();
  }
}

run().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
