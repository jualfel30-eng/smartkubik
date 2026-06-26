/**
 * Chequeo (solo lectura): detecta productos activos sin inventario activo.
 *
 * Convierte el "producto en catálogo pero no en inventario" — que hoy se descubre
 * por llamada de cliente — en un comando reproducible para monitoreo.
 *
 * Reporta, por tenant:
 *   - productos ACTIVOS sin NINGÚN inventario activo (la causa del síntoma)
 *   - docs de inventario con warehouseId undefined (incidente 2026-03-26)
 *   - productIds con docs duplicados (String + ObjectId) que burlan el índice único
 *
 * Uso:
 *   MONGODB_URI=... npx ts-node -r dotenv/config scripts/check-orphaned-inventory.ts                 # todos los tenants con productos
 *   MONGODB_URI=... npx ts-node -r dotenv/config scripts/check-orphaned-inventory.ts --tenant=<id>   # uno
 *   ... --verbose   # lista los SKUs huérfanos
 *
 * Exit code 0 si no hay huérfanos en el scope; 1 si los hay (apto para CI/cron).
 */
import { MongoClient, ObjectId } from "mongodb";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : undefined;
}
function forms(id: string): any[] {
  const f: any[] = [id];
  try {
    f.push(new ObjectId(id));
  } catch {
    /* not oid */
  }
  return f;
}

async function checkTenant(db: any, tenantId: string, verbose: boolean) {
  const tFilter = { tenantId: { $in: forms(tenantId) } };

  const products = await db
    .collection("products")
    .find({ ...tFilter, isActive: { $ne: false }, isDeleted: { $ne: true } })
    .project({ _id: 1, sku: 1 })
    .toArray();
  if (products.length === 0) return null;

  const invs = await db
    .collection("inventories")
    .find(tFilter)
    .project({ productId: 1, isActive: 1, isDeleted: 1, warehouseId: 1 })
    .toArray();

  const hasActive = new Set<string>();
  const formsByProduct = new Map<string, Set<string>>();
  let undefWarehouse = 0;
  for (const i of invs) {
    const pid = (i.productId ?? "").toString();
    if (i.isActive !== false && i.isDeleted !== true) hasActive.add(pid);
    if (!i.warehouseId) undefWarehouse++;
    const set = formsByProduct.get(pid) || new Set<string>();
    set.add(typeof i.productId); // "string" | "object"
    formsByProduct.set(pid, set);
  }

  const orphans = products.filter((p: any) => !hasActive.has(p._id.toString()));
  const mixedForm = [...formsByProduct.values()].filter(
    (s) => s.size > 1,
  ).length;

  return {
    tenantId,
    products: products.length,
    invDocs: invs.length,
    orphans: orphans.length,
    undefWarehouse,
    mixedFormProductIds: mixedForm,
    orphanSkus: verbose ? orphans.map((p: any) => p.sku) : undefined,
  };
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const verbose = process.argv.includes("--verbose");
  const one = arg("tenant");

  const client = await MongoClient.connect(uri);
  try {
    const db = client.db();
    let tenantIds: string[];
    if (one) {
      tenantIds = [one];
    } else {
      const ids = await db.collection("products").distinct("tenantId");
      tenantIds = ids.map((x: any) => x.toString());
    }

    let totalOrphans = 0;
    for (const tid of tenantIds) {
      const r = await checkTenant(db, tid, verbose);
      if (!r) continue;
      if (r.orphans > 0 || r.undefWarehouse > 0 || r.mixedFormProductIds > 0) {
        totalOrphans += r.orphans;
        console.log(
          `tenant=${r.tenantId} products=${r.products} invDocs=${r.invDocs} ` +
            `ORPHANS=${r.orphans} undefWarehouse=${r.undefWarehouse} mixedFormIds=${r.mixedFormProductIds}`,
        );
        if (verbose && r.orphanSkus && r.orphanSkus.length > 0) {
          console.log(`   orphan SKUs: ${r.orphanSkus.join(", ")}`);
        }
      }
    }

    if (totalOrphans === 0) {
      console.log("OK: 0 productos activos sin inventario activo en el scope.");
      process.exit(0);
    } else {
      console.log(`\nTOTAL huérfanos en scope: ${totalOrphans}`);
      process.exit(1);
    }
  } finally {
    await client.close();
  }
}

run().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
