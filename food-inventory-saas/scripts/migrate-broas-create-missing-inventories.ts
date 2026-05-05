/**
 * migrate-broas-create-missing-inventories.ts
 *
 * Materializes the new "auto-create inventory on product creation" feature
 * retroactively for the Broas tenant group (matrix + 2 subsidiaries).
 *
 * For every product in the catalog of the matrix tenant, ensures that an
 * Inventory document exists with totalQuantity=0 for each tenant in the
 * group, in the tenant's first active warehouse, with one row per variant.
 *
 * Idempotent: existing (tenantId, productId, variantId) inventories are
 * skipped untouched.
 *
 * USAGE:
 *   npx ts-node scripts/migrate-broas-create-missing-inventories.ts          # dry run
 *   npx ts-node scripts/migrate-broas-create-missing-inventories.ts --apply  # commit
 */

import { MongoClient, ObjectId } from "mongodb";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const APPLY = process.argv.includes("--apply");

const MATRIX_TENANT_ID = "69b187062339e815ceba7487";
const TENANT_GROUP = [
  { id: "69b187062339e815ceba7487", name: "Tiendas Broas, C.A." },
  { id: "69b4a446b8ddae1e2283d188", name: "Tiendas Broas - Periférico" },
  { id: "69b481c03d5ba33267c3ada0", name: "Tiendas Broas - El Parral" },
];

interface PerTenantStats {
  name: string;
  warehouseId: string | null;
  preExisting: number;
  toCreate: number;
  created: number;
  skippedNoWarehouse: number;
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  console.log("=".repeat(70));
  console.log("Broas — retroactive inventory backfill");
  console.log("=".repeat(70));
  console.log(`Mode: ${APPLY ? "APPLY (writes will commit)" : "DRY RUN (no writes)"}`);
  console.log("");

  const client = await MongoClient.connect(uri);
  const db = client.db("test");

  const productsCol = db.collection("products");
  const inventoriesCol = db.collection("inventories");
  const warehousesCol = db.collection("warehouses");

  // 1. Resolve a usable warehouse for each tenant in the group.
  const warehouseByTenant = new Map<string, ObjectId | null>();
  for (const t of TENANT_GROUP) {
    const tenantFilter = {
      tenantId: { $in: [t.id, new ObjectId(t.id)] },
      isActive: true,
      isDeleted: { $ne: true },
    };
    let wh: any = await warehousesCol.findOne({ ...tenantFilter, isDefault: true });
    if (!wh) {
      wh = await warehousesCol.findOne(tenantFilter);
    }
    warehouseByTenant.set(t.id, wh?._id ?? null);
    console.log(`Warehouse for ${t.name}: ${wh ? wh.name + " (" + wh._id + ")" : "NONE"}`);
  }
  console.log("");

  // 2. Load all products from the matrix catalog.
  const matrixFilter = {
    tenantId: { $in: [MATRIX_TENANT_ID, new ObjectId(MATRIX_TENANT_ID)] },
    isActive: { $ne: false },
  };
  const products = await productsCol
    .find(matrixFilter, { projection: { sku: 1, name: 1, variants: 1 } })
    .toArray();
  console.log(`Catalog products to backfill: ${products.length}`);

  // 3. For each tenant, load existing inventories into a fast-lookup set keyed
  //    by `productId|variantId` (variantId may be empty for variant-less rows).
  const existingByTenant = new Map<string, Set<string>>();
  for (const t of TENANT_GROUP) {
    const tf = { tenantId: { $in: [t.id, new ObjectId(t.id)] } };
    const invs = await inventoriesCol
      .find(tf, { projection: { productId: 1, variantId: 1 } })
      .toArray();
    const set = new Set<string>();
    for (const inv of invs) {
      const pid = inv.productId?.toString() ?? "";
      const vid = inv.variantId?.toString() ?? "";
      set.add(`${pid}|${vid}`);
    }
    existingByTenant.set(t.id, set);
    console.log(`  ${t.name}: ${set.size} pre-existing inventories`);
  }
  console.log("");

  // 4. Plan the work: for each (tenant × product × variant), determine if a row
  //    needs to be created.
  const stats: Record<string, PerTenantStats> = {};
  for (const t of TENANT_GROUP) {
    stats[t.id] = {
      name: t.name,
      warehouseId: warehouseByTenant.get(t.id)?.toString() ?? null,
      preExisting: existingByTenant.get(t.id)!.size,
      toCreate: 0,
      created: 0,
      skippedNoWarehouse: 0,
    };
  }

  const docsToInsertByTenant = new Map<string, any[]>();
  for (const t of TENANT_GROUP) docsToInsertByTenant.set(t.id, []);

  for (const product of products) {
    const variants = product.variants && product.variants.length > 0 ? product.variants : [null];

    for (const t of TENANT_GROUP) {
      const warehouseId = warehouseByTenant.get(t.id);
      if (!warehouseId) {
        stats[t.id].skippedNoWarehouse += variants.length;
        continue;
      }
      const existing = existingByTenant.get(t.id)!;
      const tenantObj = new ObjectId(t.id);

      for (const variant of variants) {
        const variantId = variant?._id?.toString() ?? "";
        const key = `${product._id.toString()}|${variantId}`;
        if (existing.has(key)) continue;

        const costPrice = (variant as any)?.costPrice ?? 0;
        const doc: any = {
          tenantId: tenantObj,
          warehouseId,
          productId: product._id,
          productSku: product.sku,
          productName: product.name,
          totalQuantity: 0,
          availableQuantity: 0,
          reservedQuantity: 0,
          committedQuantity: 0,
          averageCostPrice: costPrice,
          lastCostPrice: costPrice,
          lots: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        if (variant?._id) {
          doc.variantId = variant._id;
          if (variant.sku) doc.variantSku = variant.sku;
        }
        docsToInsertByTenant.get(t.id)!.push(doc);
        stats[t.id].toCreate++;
      }
    }
  }

  console.log("Planned work per tenant:");
  for (const t of TENANT_GROUP) {
    const s = stats[t.id];
    console.log(`  ${s.name}: ${s.toCreate} new inventories (${s.preExisting} pre-existing, ${s.skippedNoWarehouse} skipped no-warehouse)`);
  }
  console.log("");

  if (!APPLY) {
    console.log("DRY RUN — no writes were made. Re-run with --apply to commit.");
    await client.close();
    return;
  }

  // 5. Bulk insert per tenant in chunks of 500.
  const CHUNK = 500;
  for (const t of TENANT_GROUP) {
    const docs = docsToInsertByTenant.get(t.id)!;
    if (docs.length === 0) continue;
    let inserted = 0;
    for (let i = 0; i < docs.length; i += CHUNK) {
      const chunk = docs.slice(i, i + CHUNK);
      const result = await inventoriesCol.insertMany(chunk, { ordered: false });
      inserted += result.insertedCount;
    }
    stats[t.id].created = inserted;
    console.log(`  ${t.name}: inserted ${inserted}`);
  }

  // 6. Verification.
  console.log("\n--- POST-MIGRATION VERIFICATION ---");
  for (const t of TENANT_GROUP) {
    const tf = { tenantId: { $in: [t.id, new ObjectId(t.id)] } };
    const total = await inventoriesCol.countDocuments(tf);
    console.log(`  ${t.name}: now has ${total} inventories total (was ${stats[t.id].preExisting})`);
  }

  await client.close();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
