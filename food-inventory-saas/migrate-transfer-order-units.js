/**
 * MIGRATION: Backfill selectedUnit + unitOfMeasure on transfer order items
 *
 * Problem: Transfer orders created before the fix don't have selectedUnit/unitOfMeasure
 *          on their items, so the detail view shows "—" in the Unidad column.
 *
 * Strategy:
 *   - For each item missing selectedUnit/unitOfMeasure → look up the product and copy unitOfMeasure
 *   - Items that already have selectedUnit or unitOfMeasure → skip (don't overwrite)
 *   - If product not found → fallback to 'unidad'
 *   - Items with conversionFactor already set → keep it, just fill missing unit fields
 *
 * Run: node migrate-transfer-order-units.js [--dry-run]
 */

require('dotenv').config();
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log(`\n=== MIGRATE TRANSFER ORDER UNITS ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'} ===\n`);

  // Load all transfer orders that have at least one item without unit
  const orders = await db.collection('transferorders').find({
    'items': {
      $elemMatch: {
        selectedUnit: { $in: [null, undefined, ''] },
        unitOfMeasure: { $in: [null, undefined, ''] }
      }
    }
  }).toArray();

  console.log(`Orders to process: ${orders.length}`);

  // Collect all unique productIds we need to look up
  const productIdSet = new Set();
  for (const order of orders) {
    for (const item of (order.items || [])) {
      if (!item.selectedUnit && !item.unitOfMeasure && item.productId) {
        productIdSet.add(item.productId.toString());
      }
    }
  }

  console.log(`Unique productIds to look up: ${productIdSet.size}`);

  // Fetch all those products in one query
  const productIds = [...productIdSet].map(id => {
    try { return new mongoose.Types.ObjectId(id); } catch { return id; }
  });

  const products = await db.collection('products').find(
    { _id: { $in: productIds } },
    { projection: { _id: 1, name: 1, unitOfMeasure: 1 } }
  ).toArray();

  // Build lookup map: productId string → unitOfMeasure
  const unitMap = {};
  for (const p of products) {
    unitMap[p._id.toString()] = p.unitOfMeasure || 'unidad';
  }
  console.log(`Products found: ${products.length} / ${productIdSet.size}`);
  if (products.length < productIdSet.size) {
    const missing = [...productIdSet].filter(id => !unitMap[id]);
    console.log(`  ⚠️  ${missing.length} products NOT found (will use 'unidad' fallback):`);
    for (const id of missing.slice(0, 10)) console.log(`     - ${id}`);
  }

  // Process each order
  let ordersUpdated = 0;
  let itemsUpdated = 0;
  let itemsSkipped = 0;

  for (const order of orders) {
    let changed = false;
    const updatedItems = (order.items || []).map(item => {
      // Skip items that already have unit info
      if (item.selectedUnit || item.unitOfMeasure) {
        itemsSkipped++;
        return item;
      }

      const productId = item.productId?.toString();
      const unit = (productId && unitMap[productId]) || 'unidad';

      itemsUpdated++;
      changed = true;

      return {
        ...item,
        selectedUnit: unit,
        unitOfMeasure: unit,
        // Keep existing conversionFactor if present
      };
    });

    if (!changed) continue;
    ordersUpdated++;

    if (!DRY_RUN) {
      await db.collection('transferorders').updateOne(
        { _id: order._id },
        { $set: { items: updatedItems } }
      );
    } else {
      console.log(`  [DRY] Would update ${order.orderNumber} — items updated in this order: ${updatedItems.filter((_, i) => !order.items[i].selectedUnit && !order.items[i].unitOfMeasure).length}`);
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`  Orders updated:  ${ordersUpdated}`);
  console.log(`  Items updated:   ${itemsUpdated}`);
  console.log(`  Items skipped:   ${itemsSkipped} (already had unit)`);
  if (DRY_RUN) console.log(`\n  ⚠️  DRY RUN — no changes written. Remove --dry-run to apply.`);
  else console.log(`\n  ✅ Migration complete.`);

  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
