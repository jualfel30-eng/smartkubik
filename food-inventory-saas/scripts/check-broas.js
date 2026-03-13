const { MongoClient } = require('mongodb');

async function checkBroas() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('test');

    // Find tenants with "Broas" in the name
    const tenants = await db.collection('tenants').find({
      name: { $regex: /broas/i }
    }).toArray();

    console.log(`\n=== TENANTS WITH "BROAS" ===`);
    for (const t of tenants) {
      console.log(`  ID: ${t._id} | Name: ${t.name} | Vertical: ${t.vertical}`);
    }

    if (tenants.length === 0) {
      console.log('No tenants found with "Broas". Searching all tenants...');
      const all = await db.collection('tenants').find({}).project({ _id: 1, name: 1 }).toArray();
      all.forEach(t => console.log(`  ${t._id} - ${t.name}`));
      return;
    }

    // For each Broas tenant, check products, warehouses, locations, inventory
    for (const tenant of tenants) {
      const tid = tenant._id;
      console.log(`\n=== TENANT: ${tenant.name} (${tid}) ===`);

      // Check if there are multiple memberships (could indicate multiple "sedes" as separate tenants)
      const memberships = await db.collection('usertenantmemberships').find({ tenantId: tid }).toArray();
      console.log(`  Memberships: ${memberships.length}`);

      // Warehouses
      const warehouses = await db.collection('warehouses').find({ tenantId: tid, isDeleted: { $ne: true } }).toArray();
      console.log(`  Warehouses: ${warehouses.length}`);
      warehouses.forEach(w => console.log(`    - ${w.name} (${w.code}) | locationId: ${w.locationId || 'none'}`));

      // Business Locations
      const locations = await db.collection('businesslocations').find({ tenantId: tid, isDeleted: { $ne: true } }).toArray();
      console.log(`  Business Locations: ${locations.length}`);
      locations.forEach(l => console.log(`    - ${l.name} (${l.code}) | type: ${l.type} | warehouses: ${l.warehouseIds?.length || 0}`));

      // Products
      const productCount = await db.collection('products').countDocuments({ tenantId: tid, isDeleted: { $ne: true } });
      console.log(`  Products: ${productCount}`);

      // Sample products
      const sampleProducts = await db.collection('products').find({ tenantId: tid, isDeleted: { $ne: true } }).limit(5).project({ name: 1, sku: 1 }).toArray();
      sampleProducts.forEach(p => console.log(`    - ${p.name} (${p.sku || 'no-sku'})`));

      // Inventory records
      const inventoryCount = await db.collection('inventories').countDocuments({ tenantId: tid });
      console.log(`  Inventory records: ${inventoryCount}`);

      // Sample inventory with warehouse info
      const sampleInv = await db.collection('inventories').find({ tenantId: tid }).limit(5).toArray();
      for (const inv of sampleInv) {
        const prod = await db.collection('products').findOne({ _id: inv.productId });
        const wh = await db.collection('warehouses').findOne({ _id: inv.warehouseId });
        console.log(`    - Product: ${prod?.name || 'unknown'} | Warehouse: ${wh?.name || 'unknown'} | Qty: ${inv.quantity}`);
      }
    }

    // ALSO check if "Broas" exists as MULTIPLE tenants (separate orgs for each sede)
    console.log('\n=== CHECKING IF BROAS HAS MULTIPLE TENANT ACCOUNTS ===');
    const broasTenants = await db.collection('tenants').find({
      name: { $regex: /broas/i }
    }).toArray();
    console.log(`Total tenants matching "Broas": ${broasTenants.length}`);
    broasTenants.forEach(t => console.log(`  ${t._id} - "${t.name}"`));

  } finally {
    await client.close();
  }
}

checkBroas().catch(console.error);
