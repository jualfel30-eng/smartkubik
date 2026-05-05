/**
 * reset-broas-inventory-quantities.ts
 *
 * Coordinated inventory reset for the Broas tenant group.
 *
 * For every active inventory in the 3 Broas tenants whose totalQuantity (or
 * availableQuantity / reservedQuantity / committedQuantity) is non-zero, sets
 * all four quantities to 0. For each affected document, also writes an
 * InventoryMovement of type ADJUSTMENT with reason "Reset pre-reconteo físico"
 * for clean audit trail.
 *
 * Preserves: products, lots[] structure (which is empty for Broas anyway),
 * inventory _ids, and the historical movements collection.
 *
 * Pre-conditions checked at the start of the run:
 *   - 0 orders in pending/partial/processing state across the group
 *   - 0 transferorders active across the group
 *
 * USAGE:
 *   npx ts-node scripts/reset-broas-inventory-quantities.ts          # dry run
 *   npx ts-node scripts/reset-broas-inventory-quantities.ts --apply  # commit
 */

import { MongoClient, ObjectId } from "mongodb";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const APPLY = process.argv.includes("--apply");

const TENANT_GROUP = [
  { id: "69b187062339e815ceba7487", name: "Tiendas Broas, C.A." },
  { id: "69b4a446b8ddae1e2283d188", name: "Tiendas Broas - Periférico" },
  { id: "69b481c03d5ba33267c3ada0", name: "Tiendas Broas - El Parral" },
];

const RESET_REASON = "Reset pre-reconteo físico";
const SCRIPT_USER_ID = "69b187092339e815ceba74c7"; // Diego Simao — admin de Broas C.A.

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  console.log("=".repeat(70));
  console.log("Broas — coordinated inventory reset");
  console.log("=".repeat(70));
  console.log(`Mode: ${APPLY ? "APPLY (writes will commit)" : "DRY RUN (no writes)"}`);
  console.log("");

  const client = await MongoClient.connect(uri);
  const db = client.db("test");

  const inventoriesCol = db.collection("inventories");
  const movementsCol = db.collection("inventorymovements");
  const ordersCol = db.collection("orders");
  const transferOrdersCol = db.collection("transferorders");

  // 1. Pre-flight safety checks.
  console.log("--- PRE-FLIGHT CHECKS ---");
  let unsafe = false;
  for (const t of TENANT_GROUP) {
    const tf = { tenantId: { $in: [t.id, new ObjectId(t.id)] } };
    const pendingOrders = await ordersCol.countDocuments({
      ...tf,
      status: { $in: ["pending", "partial", "processing"] },
    });
    const activeTransfers = await transferOrdersCol.countDocuments({
      ...tf,
      status: { $in: ["pending", "approved", "in_transit", "shipped"] },
    });
    console.log(`  ${t.name}: pendingOrders=${pendingOrders} | activeTransfers=${activeTransfers}`);
    if (pendingOrders > 0 || activeTransfers > 0) unsafe = true;
  }
  if (unsafe) {
    console.error("ABORTED: there are pending orders or active transfers — fix those first.");
    await client.close();
    process.exit(1);
  }
  console.log("Pre-flight: OK");
  console.log("");

  // 2. For each tenant, find inventories with non-zero quantities.
  console.log("--- PLAN ---");
  const planByTenant = new Map<string, any[]>();
  let totalToReset = 0;

  for (const t of TENANT_GROUP) {
    const tf = {
      tenantId: { $in: [t.id, new ObjectId(t.id)] },
      isActive: { $ne: false },
      isDeleted: { $ne: true },
      $or: [
        { totalQuantity: { $gt: 0 } },
        { availableQuantity: { $gt: 0 } },
        { reservedQuantity: { $gt: 0 } },
        { committedQuantity: { $gt: 0 } },
      ],
    };
    const docs = await inventoriesCol
      .find(tf, {
        projection: {
          _id: 1,
          tenantId: 1,
          warehouseId: 1,
          productId: 1,
          productSku: 1,
          totalQuantity: 1,
          availableQuantity: 1,
          reservedQuantity: 1,
          committedQuantity: 1,
          averageCostPrice: 1,
        },
      })
      .toArray();
    planByTenant.set(t.id, docs);
    totalToReset += docs.length;
    const sumQty = docs.reduce((acc, d) => acc + (d.totalQuantity || 0), 0);
    console.log(`  ${t.name}: ${docs.length} inventories with stock | total qty to clear: ${sumQty}`);
  }

  console.log("");
  console.log(`TOTAL inventories to reset: ${totalToReset}`);
  console.log(`TOTAL movements to insert: ${totalToReset}`);
  console.log("");

  if (!APPLY) {
    console.log("DRY RUN — no writes were made. Re-run with --apply to commit.");
    await client.close();
    return;
  }

  // 3. Apply: per inventory, write the ADJUSTMENT movement and zero the quantities.
  const userObj = new ObjectId(SCRIPT_USER_ID);
  for (const t of TENANT_GROUP) {
    const docs = planByTenant.get(t.id)!;
    if (docs.length === 0) continue;

    const movementDocs: any[] = [];
    const now = new Date();

    for (const inv of docs) {
      const oldQty = inv.totalQuantity || 0;
      const costPrice = inv.averageCostPrice || 0;
      movementDocs.push({
        inventoryId: inv._id,
        warehouseId: inv.warehouseId,
        productId: inv.productId,
        productSku: inv.productSku,
        movementType: "ADJUSTMENT",
        quantity: -oldQty,
        unitCost: costPrice,
        totalCost: -oldQty * costPrice,
        reason: RESET_REASON,
        balanceAfter: {
          totalQuantity: 0,
          availableQuantity: 0,
          reservedQuantity: 0,
          averageCostPrice: costPrice,
        },
        tenantId: inv.tenantId,
        createdBy: userObj,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Bulk insert movements (chunks of 500).
    const CHUNK = 500;
    let movInserted = 0;
    for (let i = 0; i < movementDocs.length; i += CHUNK) {
      const chunk = movementDocs.slice(i, i + CHUNK);
      const result = await movementsCol.insertMany(chunk, { ordered: false });
      movInserted += result.insertedCount;
    }

    // Bulk update inventories: zero all four quantities.
    const ids = docs.map((d) => d._id);
    const updateResult = await inventoriesCol.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          totalQuantity: 0,
          availableQuantity: 0,
          reservedQuantity: 0,
          committedQuantity: 0,
          updatedAt: now,
          updatedBy: userObj,
        },
      },
    );

    console.log(`  ${t.name}: zeroed ${updateResult.modifiedCount} inventories | inserted ${movInserted} movements`);
  }

  // 4. Verification.
  console.log("\n--- POST-RESET VERIFICATION ---");
  for (const t of TENANT_GROUP) {
    const tf = {
      tenantId: { $in: [t.id, new ObjectId(t.id)] },
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    };
    const total = await inventoriesCol.countDocuments(tf);
    const withStock = await inventoriesCol.countDocuments({
      ...tf,
      $or: [
        { totalQuantity: { $gt: 0 } },
        { availableQuantity: { $gt: 0 } },
        { reservedQuantity: { $gt: 0 } },
        { committedQuantity: { $gt: 0 } },
      ],
    });
    const sumAgg = await inventoriesCol
      .aggregate([
        { $match: tf },
        { $group: { _id: null, sumTotal: { $sum: "$totalQuantity" } } },
      ])
      .toArray();
    const sumTotal = sumAgg[0]?.sumTotal ?? 0;
    console.log(`  ${t.name}: ${total} active inventories | ${withStock} with stock>0 | sumTotalQty=${sumTotal}`);
  }

  await client.close();
}

run().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
