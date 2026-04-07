/**
 * Migration Script: Fix Purchase Order Dates
 *
 * Problem: Purchase orders were recording dates 1 day earlier due to timezone issues.
 * When dates were sent as 'yyyy-MM-dd' without timezone, MongoDB interpreted them
 * as UTC midnight, causing a 1-day offset in timezones behind UTC (e.g., Venezuela UTC-4).
 *
 * Solution: Add +1 day to all existing purchase order dates to correct the offset.
 *
 * This script:
 * 1. Connects to MongoDB
 * 2. Finds all purchase orders
 * 3. Adds 1 day to purchaseDate field
 * 4. Logs all changes for verification
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

async function fixPurchaseOrderDates() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('test'); // Production DB is 'test'
    const purchaseOrdersCollection = db.collection('purchaseorders');

    // Find all purchase orders
    const purchaseOrders = await purchaseOrdersCollection.find({}).toArray();

    console.log(`📊 Found ${purchaseOrders.length} purchase orders\n`);

    if (purchaseOrders.length === 0) {
      console.log('No purchase orders to migrate.');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;
    const changes = [];

    // Process each purchase order
    for (const po of purchaseOrders) {
      if (!po.purchaseDate) {
        console.log(`⚠️  Skipping PO ${po.purchaseOrderNumber} - no purchaseDate`);
        skippedCount++;
        continue;
      }

      const oldDate = new Date(po.purchaseDate);
      const newDate = new Date(oldDate);
      newDate.setDate(newDate.getDate() + 1); // Add 1 day

      // Update the purchase order
      await purchaseOrdersCollection.updateOne(
        { _id: po._id },
        { $set: { purchaseDate: newDate } }
      );

      changes.push({
        purchaseOrderNumber: po.purchaseOrderNumber,
        oldDate: oldDate.toISOString().split('T')[0],
        newDate: newDate.toISOString().split('T')[0],
        tenantId: po.tenantId
      });

      updatedCount++;
    }

    // Print summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 MIGRATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Updated: ${updatedCount} purchase orders`);
    console.log(`⏭️  Skipped: ${skippedCount} purchase orders`);
    console.log('');

    // Print detailed changes
    if (changes.length > 0) {
      console.log('📝 DETAILED CHANGES:\n');
      changes.forEach(change => {
        console.log(`  PO: ${change.purchaseOrderNumber}`);
        console.log(`    Old Date: ${change.oldDate}`);
        console.log(`    New Date: ${change.newDate}`);
        console.log(`    Tenant: ${change.tenantId}`);
        console.log('');
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migration completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
fixPurchaseOrderDates()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
