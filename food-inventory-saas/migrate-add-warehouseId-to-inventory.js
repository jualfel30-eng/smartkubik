const mongoose = require('mongoose');

const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

const TENANT_ID = '69b187062339e815ceba7487'; // Tiendas Broas
const WAREHOUSE_ID = '69b34dd1eda70c9386a111d8'; // Broas Almacén

async function migrateInventoryWarehouseId() {
  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    // Count inventories without warehouseId
    const countBefore = await mongoose.connection.db.collection('inventories').countDocuments({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      $or: [
        { warehouseId: { $exists: false } },
        { warehouseId: null }
      ]
    });

    console.log(`📊 Inventories without warehouseId: ${countBefore}`);

    if (countBefore === 0) {
      console.log('✅ No migration needed - all inventories have warehouseId');
      await mongoose.connection.close();
      return;
    }

    // Update all inventories without warehouseId
    const result = await mongoose.connection.db.collection('inventories').updateMany(
      {
        tenantId: new mongoose.Types.ObjectId(TENANT_ID),
        $or: [
          { warehouseId: { $exists: false } },
          { warehouseId: null }
        ]
      },
      {
        $set: {
          warehouseId: new mongoose.Types.ObjectId(WAREHOUSE_ID)
        }
      }
    );

    console.log(`\n✅ Migration completed!`);
    console.log(`   - Updated: ${result.modifiedCount} inventories`);
    console.log(`   - Warehouse: "Broas Almacén" (${WAREHOUSE_ID})`);

    // Verify
    const countAfter = await mongoose.connection.db.collection('inventories').countDocuments({
      tenantId: new mongoose.Types.ObjectId(TENANT_ID),
      $or: [
        { warehouseId: { $exists: false } },
        { warehouseId: null }
      ]
    });

    console.log(`\n📊 Verification:`);
    console.log(`   - Inventories still without warehouseId: ${countAfter}`);
    console.log(`   - Migration success: ${countAfter === 0 ? '✅ YES' : '❌ NO'}`);

    await mongoose.connection.close();
    console.log('\n🔒 Connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

migrateInventoryWarehouseId();
