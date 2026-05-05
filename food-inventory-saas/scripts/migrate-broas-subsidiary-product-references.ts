/**
 * migrate-broas-subsidiary-product-references.ts
 *
 * Fixes referential integrity for the Broas tenant group (matrix + 2 subsidiaries).
 *
 * PROBLEM:
 *   Subsidiary tenants (Periférico, El Parral) have inventories and movements
 *   pointing to products that live in the SUBSIDIARY tenant itself, not in the
 *   matrix. Because the products controller redirects all catalog queries to the
 *   matrix via getCatalogTenantId(), the UI shows the matrix catalog (1467 products)
 *   while these inventories silently reference duplicate products that the UI
 *   never displays. The desnormalized productSku/productName fields keep the UI
 *   from breaking visually, but the data is inconsistent.
 *
 * WHAT THIS SCRIPT DOES:
 *   For each inventory and inventory movement in a subsidiary tenant whose productId
 *   points to a product owned by that same subsidiary, find the matching product in
 *   the matrix tenant by SKU and update the productId to point to it.
 *
 * WHAT IT DOES NOT TOUCH:
 *   - The orphan products themselves (still reachable for rollback if needed).
 *   - The single product that exists ONLY in Periférico ("Maiz sabor a queso Kg",
 *     SKU TBS-1386, qty=1). It is logged but skipped because there is no matrix
 *     equivalent. The pending inventory reset will leave it at qty=0; the client
 *     can later decide whether it is a real product (create in matrix) or test
 *     residue (delete).
 *
 * SAFETY:
 *   - Pre-flight checks ran clean: 0 ambiguous SKUs, 0 collisions with unique index.
 *   - Full DB backup taken at backups/pre-inventory-reset-broas-20260505_115221/
 *
 * USAGE:
 *   npx ts-node scripts/migrate-broas-subsidiary-product-references.ts          # dry run
 *   npx ts-node scripts/migrate-broas-subsidiary-product-references.ts --apply  # commit
 */

import { MongoClient, ObjectId } from "mongodb";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const APPLY = process.argv.includes("--apply");

const MATRIX_TENANT_ID = "69b187062339e815ceba7487";
const SUBSIDIARIES = [
  { id: "69b4a446b8ddae1e2283d188", name: "Periférico" },
  { id: "69b481c03d5ba33267c3ada0", name: "El Parral" },
];

interface MigrationResult {
  inventoriesMigrated: number;
  inventoriesSkipped: number;
  movementsMigrated: number;
  movementsSkipped: number;
  skippedDetails: Array<{ collection: string; sku: string; reason: string }>;
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI not set in environment");
  }

  console.log("=".repeat(70));
  console.log("Broas subsidiary product reference migration");
  console.log("=".repeat(70));
  console.log(`Mode: ${APPLY ? "APPLY (writes will commit)" : "DRY RUN (no writes)"}`);
  console.log(`Matrix tenant: ${MATRIX_TENANT_ID}`);
  console.log(`Subsidiaries: ${SUBSIDIARIES.map((s) => s.name).join(", ")}`);
  console.log("");

  const client = await MongoClient.connect(uri);
  const db = client.db("test");

  const productsCol = db.collection("products");
  const inventoriesCol = db.collection("inventories");
  const movementsCol = db.collection("inventorymovements");

  const result: MigrationResult = {
    inventoriesMigrated: 0,
    inventoriesSkipped: 0,
    movementsMigrated: 0,
    movementsSkipped: 0,
    skippedDetails: [],
  };

  for (const sub of SUBSIDIARIES) {
    console.log(`\n--- ${sub.name} (${sub.id}) ---`);
    const subFilter = {
      tenantId: { $in: [sub.id, new ObjectId(sub.id)] },
    };

    // ========== INVENTORIES ==========
    const inventories = await inventoriesCol
      .find(subFilter, { projection: { productId: 1, productSku: 1, productName: 1, totalQuantity: 1 } })
      .toArray();

    let invMigrated = 0;
    let invSkipped = 0;

    for (const inv of inventories) {
      if (!inv.productId) {
        invSkipped++;
        result.skippedDetails.push({
          collection: "inventories",
          sku: inv.productSku || "(no sku)",
          reason: "missing productId",
        });
        continue;
      }

      const product = await productsCol.findOne(
        { _id: inv.productId instanceof ObjectId ? inv.productId : new ObjectId(inv.productId) },
        { projection: { tenantId: 1, sku: 1 } },
      );

      if (!product) {
        invSkipped++;
        result.skippedDetails.push({
          collection: "inventories",
          sku: inv.productSku,
          reason: "productId not found",
        });
        continue;
      }

      const productTenantId = product.tenantId.toString();

      // Already pointing to matrix → nothing to do
      if (productTenantId === MATRIX_TENANT_ID) {
        continue;
      }

      // Pointing to own-tenant → needs migration
      if (productTenantId === sub.id) {
        const matrixProduct = await productsCol.findOne({
          tenantId: { $in: [MATRIX_TENANT_ID, new ObjectId(MATRIX_TENANT_ID)] },
          sku: inv.productSku,
        });

        if (!matrixProduct) {
          invSkipped++;
          result.skippedDetails.push({
            collection: "inventories",
            sku: inv.productSku,
            reason: `unique to subsidiary (no matrix match) — inventory qty=${inv.totalQuantity}`,
          });
          console.log(`  SKIP inventory ${inv.productSku} "${inv.productName}" (qty=${inv.totalQuantity}) — no matrix equivalent`);
          continue;
        }

        if (APPLY) {
          await inventoriesCol.updateOne(
            { _id: inv._id },
            { $set: { productId: matrixProduct._id } },
          );
        }
        invMigrated++;
      } else {
        invSkipped++;
        result.skippedDetails.push({
          collection: "inventories",
          sku: inv.productSku,
          reason: `unexpected tenant (${productTenantId})`,
        });
      }
    }

    console.log(`  Inventories: ${invMigrated} migrated, ${invSkipped} skipped`);
    result.inventoriesMigrated += invMigrated;
    result.inventoriesSkipped += invSkipped;

    // ========== INVENTORY MOVEMENTS ==========
    const movements = await movementsCol
      .find(subFilter, { projection: { productId: 1, productSku: 1 } })
      .toArray();

    let movMigrated = 0;
    let movSkipped = 0;

    for (const m of movements) {
      if (!m.productId) {
        movSkipped++;
        continue;
      }

      const product = await productsCol.findOne(
        { _id: m.productId instanceof ObjectId ? m.productId : new ObjectId(m.productId) },
        { projection: { tenantId: 1 } },
      );

      if (!product) {
        movSkipped++;
        continue;
      }

      const productTenantId = product.tenantId.toString();

      if (productTenantId === MATRIX_TENANT_ID) continue;

      if (productTenantId === sub.id) {
        const matrixProduct = await productsCol.findOne({
          tenantId: { $in: [MATRIX_TENANT_ID, new ObjectId(MATRIX_TENANT_ID)] },
          sku: m.productSku,
        });

        if (!matrixProduct) {
          movSkipped++;
          continue;
        }

        if (APPLY) {
          await movementsCol.updateOne(
            { _id: m._id },
            { $set: { productId: matrixProduct._id } },
          );
        }
        movMigrated++;
      }
    }

    console.log(`  Movements: ${movMigrated} migrated, ${movSkipped} skipped`);
    result.movementsMigrated += movMigrated;
    result.movementsSkipped += movSkipped;
  }

  // ========== SUMMARY ==========
  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(`Inventories migrated: ${result.inventoriesMigrated}`);
  console.log(`Inventories skipped:  ${result.inventoriesSkipped}`);
  console.log(`Movements migrated:   ${result.movementsMigrated}`);
  console.log(`Movements skipped:    ${result.movementsSkipped}`);

  if (result.skippedDetails.length > 0) {
    console.log("\nSkipped details:");
    result.skippedDetails.forEach((d) => {
      console.log(`  [${d.collection}] SKU=${d.sku} → ${d.reason}`);
    });
  }

  // ========== POST-MIGRATION VERIFICATION ==========
  if (APPLY) {
    console.log("\n--- POST-MIGRATION VERIFICATION ---");
    for (const sub of SUBSIDIARIES) {
      const subFilter = { tenantId: { $in: [sub.id, new ObjectId(sub.id)] } };
      const invs = await inventoriesCol.find(subFilter, { projection: { productId: 1 } }).toArray();
      let toMatrix = 0;
      let toOwn = 0;
      let other = 0;
      for (const inv of invs) {
        if (!inv.productId) continue;
        const p = await productsCol.findOne(
          { _id: inv.productId instanceof ObjectId ? inv.productId : new ObjectId(inv.productId) },
          { projection: { tenantId: 1 } },
        );
        if (!p) {
          other++;
          continue;
        }
        const ptid = p.tenantId.toString();
        if (ptid === MATRIX_TENANT_ID) toMatrix++;
        else if (ptid === sub.id) toOwn++;
        else other++;
      }
      console.log(`  ${sub.name}: ${toMatrix} → matrix | ${toOwn} → own (expected: 1 for Periférico, 0 for El Parral) | ${other} other`);
    }
  } else {
    console.log("\nDRY RUN — no writes were made. Re-run with --apply to commit.");
  }

  await client.close();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
