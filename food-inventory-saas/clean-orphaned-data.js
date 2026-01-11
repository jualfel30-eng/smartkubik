require('dotenv').config();
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

async function cleanOrphanedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('=== CLEANING ORPHANED DATA ===\n');

    // Find all orphaned inventories
    console.log('Step 1: Finding orphaned inventories...\n');

    const allInventories = await db.collection('inventories').find({}).toArray();
    const orphanedInventories = [];

    for (const inv of allInventories) {
      let productId = inv.productId;

      // Convert String to ObjectId if needed
      if (typeof productId === 'string') {
        if (!ObjectId.isValid(productId)) {
          orphanedInventories.push({
            _id: inv._id,
            productName: inv.productName,
            reason: 'Invalid productId (not a valid ObjectId)',
            productId: productId,
            tenantId: inv.tenantId
          });
          continue;
        }
        productId = new ObjectId(productId);
      }

      // Check if product exists
      const product = await db.collection('products').findOne({ _id: productId });

      if (!product) {
        orphanedInventories.push({
          _id: inv._id,
          productName: inv.productName,
          reason: 'Product does not exist',
          productId: inv.productId,
          tenantId: inv.tenantId,
          totalQuantity: inv.totalQuantity,
          averageCostPrice: inv.averageCostPrice
        });
      }
    }

    console.log(`Total inventories: ${allInventories.length}`);
    console.log(`Orphaned inventories: ${orphanedInventories.length}\n`);

    if (orphanedInventories.length === 0) {
      console.log('✓ No orphaned inventories found.\n');
      await mongoose.connection.close();
      return;
    }

    console.log('Orphaned inventories found:\n');
    orphanedInventories.forEach((inv, index) => {
      console.log(`${index + 1}. ${inv.productName} (${inv._id})`);
      console.log(`   Reason: ${inv.reason}`);
      console.log(`   productId: ${inv.productId}`);
      console.log(`   Tenant: ${inv.tenantId}`);
      if (inv.totalQuantity !== undefined) {
        const costValue = (inv.totalQuantity || 0) * (inv.averageCostPrice || 0);
        console.log(`   Quantity: ${inv.totalQuantity}, Cost Value: $${costValue.toFixed(2)}`);
      }
      console.log('');
    });

    // Check if any orphaned items have reservations
    console.log('Step 2: Checking for reservations on orphaned items...\n');

    const orphanedWithReservations = [];

    for (const inv of orphanedInventories) {
      const reservations = await db.collection('reservations').find({
        inventoryId: inv._id,
        isActive: true
      }).toArray();

      if (reservations.length > 0) {
        orphanedWithReservations.push({
          ...inv,
          reservations: reservations
        });
      }
    }

    if (orphanedWithReservations.length > 0) {
      console.log(`⚠ WARNING: ${orphanedWithReservations.length} orphaned items have active reservations:\n`);
      orphanedWithReservations.forEach(inv => {
        console.log(`  - ${inv.productName} (${inv._id})`);
        console.log(`    Reservations: ${inv.reservations.length}`);
        inv.reservations.forEach(res => {
          console.log(`      * ${res.quantity} units reserved`);
        });
      });
      console.log('');
    }

    // Check if any orphaned items appear in orders
    console.log('Step 3: Checking for orders containing orphaned items...\n');

    const orphanedInOrders = [];

    for (const inv of orphanedInventories) {
      const orders = await db.collection('orders').find({
        'items.productId': inv.productId
      }).toArray();

      if (orders.length > 0) {
        orphanedInOrders.push({
          ...inv,
          orderCount: orders.length
        });
      }
    }

    if (orphanedInOrders.length > 0) {
      console.log(`⚠ WARNING: ${orphanedInOrders.length} orphaned items appear in orders:\n`);
      orphanedInOrders.forEach(inv => {
        console.log(`  - ${inv.productName} (${inv._id})`);
        console.log(`    Found in ${inv.orderCount} orders`);
      });
      console.log('');
    }

    // DRY RUN: Show what would be deleted
    console.log('=== DRY RUN: DELETION PLAN ===\n');

    console.log('The following inventory items would be deleted:\n');

    orphanedInventories.forEach((inv, index) => {
      console.log(`${index + 1}. DELETE inventory ${inv._id}`);
      console.log(`   Product: ${inv.productName}`);
      console.log(`   Tenant: ${inv.tenantId}`);
      console.log(`   Reason: ${inv.reason}`);
      console.log('');
    });

    console.log(`Total items to delete: ${orphanedInventories.length}\n`);

    // This is the actual deletion command (commented out for dry run):
    // const inventoryIds = orphanedInventories.map(inv => inv._id);
    // const deleteResult = await db.collection('inventories').deleteMany({
    //   _id: { $in: inventoryIds }
    // });
    // console.log(`Deleted ${deleteResult.deletedCount} orphaned inventory items\n`);

    console.log('=== NEXT STEPS ===\n');
    console.log('This was a DRY RUN. No data was deleted.\n');
    console.log('To execute the deletion:');
    console.log('1. Review the items above');
    console.log('2. Handle any reservations or orders manually if needed');
    console.log('3. Uncomment the deletion code in this script (line with deleteMany)');
    console.log('4. Run the script again: node clean-orphaned-data.js\n');

    await mongoose.connection.close();

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanOrphanedData();
