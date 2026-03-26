const mongoose = require('mongoose');

const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function checkInventory() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Check if there are ANY inventories at all
    const totalInventories = await mongoose.connection.db.collection('inventories').countDocuments({});
    console.log(`\nTotal inventories in database: ${totalInventories}`);

    // Get all unique tenantIds
    const tenantIds = await mongoose.connection.db.collection('inventories').distinct('tenantId');
    console.log(`\nTenant IDs with inventory: ${tenantIds.join(', ')}`);

    // Get a sample of inventory records for Tiendas Broas (try both as string and ObjectId)
    const inventoriesString = await mongoose.connection.db.collection('inventories').find({
      tenantId: '69b187062339e815ceba7487' // As string
    }).limit(5).toArray();

    const inventoriesObjectId = await mongoose.connection.db.collection('inventories').find({
      tenantId: new mongoose.Types.ObjectId('69b187062339e815ceba7487') // As ObjectId
    }).limit(5).toArray();

    const inventories = [...inventoriesString, ...inventoriesObjectId];

    console.log('\n=== Sample Inventory Records ===');
    inventories.forEach((inv, idx) => {
      console.log(`\n[${idx + 1}] Product: ${inv.productName}`);
      console.log(`  - Product SKU: ${inv.productSku}`);
      console.log(`  - Available: ${inv.availableQuantity}`);
      console.log(`  - warehouseId: ${inv.warehouseId}`);
      console.log(`  - warehouseId type: ${typeof inv.warehouseId}`);
      console.log(`  - location.warehouse: ${inv.location?.warehouse}`);
    });

    // Count total inventory with and without warehouseId (using ObjectId)
    const totalAll = await mongoose.connection.db.collection('inventories').countDocuments({
      tenantId: new mongoose.Types.ObjectId('69b187062339e815ceba7487')
    });

    const totalWithWarehouseId = await mongoose.connection.db.collection('inventories').countDocuments({
      tenantId: new mongoose.Types.ObjectId('69b187062339e815ceba7487'),
      warehouseId: { $exists: true, $ne: null }
    });

    const totalWithoutWarehouseId = await mongoose.connection.db.collection('inventories').countDocuments({
      tenantId: new mongoose.Types.ObjectId('69b187062339e815ceba7487'),
      $or: [
        { warehouseId: { $exists: false } },
        { warehouseId: null }
      ]
    });

    console.log(`\n=== Summary ===`);
    console.log(`Total inventory records: ${totalAll}`);
    console.log(`Total inventory WITH warehouseId: ${totalWithWarehouseId}`);
    console.log(`Total inventory WITHOUT warehouseId: ${totalWithoutWarehouseId}`);

    await mongoose.connection.close();
    console.log('\nConnection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInventory();
