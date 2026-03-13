const { MongoClient, ObjectId } = require('mongodb');

async function debugBroas() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('test');

    // 1. Find the user with broas.admon@gmail.com
    const user = await db.collection('users').findOne({ email: 'broas.admon@gmail.com' });
    if (!user) {
      console.log('User broas.admon@gmail.com NOT FOUND');
      return;
    }
    console.log(`\n=== USER ===`);
    console.log(`  ID: ${user._id} | Email: ${user.email} | Name: ${user.firstName} ${user.lastName}`);

    // 2. Find all memberships for this user
    const memberships = await db.collection('usertenantmemberships').find({ userId: user._id }).toArray();
    console.log(`\n=== MEMBERSHIPS (${memberships.length}) ===`);
    for (const m of memberships) {
      const tenant = await db.collection('tenants').findOne({ _id: m.tenantId });
      console.log(`  TenantId: ${m.tenantId} | Tenant: ${tenant?.name || 'UNKNOWN'} | Role: ${m.roleId}`);
    }

    // 3. For each tenant, check products, warehouses, locations, inventory
    const tenantIds = memberships.map(m => m.tenantId);
    for (const tid of tenantIds) {
      const tenant = await db.collection('tenants').findOne({ _id: tid });
      console.log(`\n${'='.repeat(60)}`);
      console.log(`TENANT: ${tenant?.name} (${tid})`);
      console.log(`${'='.repeat(60)}`);

      // Products
      const productCount = await db.collection('products').countDocuments({ tenantId: tid, isDeleted: { $ne: true } });
      console.log(`\n  PRODUCTS: ${productCount}`);

      // Warehouses
      const warehouses = await db.collection('warehouses').find({ tenantId: tid, isDeleted: { $ne: true } }).toArray();
      console.log(`\n  WAREHOUSES (${warehouses.length}):`);
      for (const w of warehouses) {
        console.log(`    - ${w.name} (${w.code}) | ID: ${w._id} | locationId: ${w.locationId || 'NONE'}`);
      }

      // Business Locations
      const locations = await db.collection('businesslocations').find({ tenantId: tid, isDeleted: { $ne: true } }).toArray();
      console.log(`\n  BUSINESS LOCATIONS (${locations.length}):`);
      for (const loc of locations) {
        console.log(`    - ${loc.name} (${loc.code}) | ID: ${loc._id} | type: ${loc.type}`);
        console.log(`      warehouseIds: [${(loc.warehouseIds || []).map(id => id.toString()).join(', ')}]`);

        // For each location, check inventory in its warehouses
        const locWarehouseIds = loc.warehouseIds || [];
        if (locWarehouseIds.length > 0) {
          const inventoryCount = await db.collection('inventories').countDocuments({
            tenantId: tid,
            warehouseId: { $in: locWarehouseIds }
          });
          const inventoryWithStock = await db.collection('inventories').countDocuments({
            tenantId: tid,
            warehouseId: { $in: locWarehouseIds },
            quantity: { $gt: 0 }
          });
          console.log(`      Inventory records: ${inventoryCount} (with stock > 0: ${inventoryWithStock})`);

          // Sample inventory
          const sampleInv = await db.collection('inventories').find({
            tenantId: tid,
            warehouseId: { $in: locWarehouseIds }
          }).limit(3).toArray();
          for (const inv of sampleInv) {
            const prod = await db.collection('products').findOne({ _id: inv.productId });
            const wh = await db.collection('warehouses').findOne({ _id: inv.warehouseId });
            console.log(`        Product: ${prod?.name || 'unknown'} | WH: ${wh?.name || 'unknown'} | Qty: ${inv.quantity}`);
          }
        } else {
          console.log(`      NO warehouses linked to this location!`);
        }
      }

      // Total inventory records
      const totalInv = await db.collection('inventories').countDocuments({ tenantId: tid });
      const totalInvWithStock = await db.collection('inventories').countDocuments({ tenantId: tid, quantity: { $gt: 0 } });
      console.log(`\n  TOTAL INVENTORY: ${totalInv} records (with stock > 0: ${totalInvWithStock})`);

      // Check which warehouses have inventory
      if (warehouses.length > 0) {
        console.log(`\n  INVENTORY PER WAREHOUSE:`);
        for (const w of warehouses) {
          const whInv = await db.collection('inventories').countDocuments({ tenantId: tid, warehouseId: w._id });
          const whInvStock = await db.collection('inventories').countDocuments({ tenantId: tid, warehouseId: w._id, quantity: { $gt: 0 } });
          console.log(`    - ${w.name} (${w._id}): ${whInv} records (stock > 0: ${whInvStock})`);
        }
      }

      // Check if inventory has warehouseId at all
      const invNoWarehouse = await db.collection('inventories').countDocuments({ tenantId: tid, warehouseId: null });
      const invNoWarehouse2 = await db.collection('inventories').countDocuments({ tenantId: tid, warehouseId: { $exists: false } });
      if (invNoWarehouse > 0 || invNoWarehouse2 > 0) {
        console.log(`\n  ⚠️  INVENTORY WITHOUT WAREHOUSE: null=${invNoWarehouse}, missing=${invNoWarehouse2}`);
      }
    }
  } finally {
    await client.close();
  }
}

debugBroas().catch(console.error);
