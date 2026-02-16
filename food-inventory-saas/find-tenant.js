// Simple check to find Tiendas Broas tenant
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

async function findTenant() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();

        console.log('\n🔍 Searching for Tiendas Broas tenant...\n');

        const tenant = await db.collection('tenants').findOne({
            name: /Tiendas Broas/i
        });

        if (tenant) {
            console.log('Found tenant:');
            console.log(`  ID: ${tenant._id}`);
            console.log(`  Name: ${tenant.name}`);
            console.log(`  ---\n`);

            const tenantId = tenant._id.toString();

            // Now find warehouses
            const warehouses = await db.collection('warehouses').find({}).toArray();
            console.log(`Total warehouses in DB: ${warehouses.length}\n`);

            const tenantWarehouses = warehouses.filter(w =>
                w.tenantId?.toString() === tenantId || w.tenantId === tenantId
            );

            console.log(`Warehouses for this tenant: ${tenantWarehouses.length}\n`);
            tenantWarehouses.forEach(wh => {
                console.log(`  ${wh.code} - ${wh.name} (ID: ${wh._id})`);
                console.log(`    tenantId type: ${typeof wh.tenantId}, value: ${wh.tenantId}`);
            });

            // Find inventory
            const inventories = await db.collection('inventories').find({}).limit(5).toArray();
            console.log(`\nTotal inventories in DB: ${await db.collection('inventories').countDocuments()}`);

            const tenantInventories = inventories.filter(inv =>
                inv.tenantId?.toString() === tenantId || inv.tenantId === tenantId
            );

            console.log(`Sample inventories for this tenant: ${tenantInventories.length}\n`);
            tenantInventories.forEach(inv => {
                console.log(`  ${inv.productName}`);
                console.log(`    warehouseId: ${inv.warehouseId}`);
                console.log(`    location.warehouse: ${inv.location?.warehouse}`);
            });

        } else {
            console.log('❌ Tenant not found');
        }

    } finally {
        await client.close();
    }
}

findTenant().catch(console.error);
