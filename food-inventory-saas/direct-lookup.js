// Direct lookup by known tenant ID
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
const tenantId = '68d55e4b764d359fed186e47';

async function directLookup() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();

        console.log(`\n🔍 Direct lookup for tenant: ${tenantId}\n`);

        // Try to find tenant
        const tenant = await db.collection('tenants').findOne({
            _id: new ObjectId(tenantId)
        });

        console.log('Tenant:', tenant ? tenant.name : 'NOT FOUND');

        // Find ALL warehouses and filter
        console.log('\n📦 All warehouses:');
        const allWarehouses = await db.collection('warehouses').find({}).toArray();
        console.log(`Total: ${allWarehouses.length}\n`);

        const matching = allWarehouses.filter(w => {
            const wTenantId = w.tenantId?.toString();
            return wTenantId === tenantId;
        });

        console.log(`Matching tenant ${tenantId}: ${matching.length}\n`);
        matching.forEach(wh => {
            console.log(`  ${wh.code} - ${wh.name}`);
            console.log(`    ID: ${wh._id}`);
            console.log(`    Active: ${wh.isActive}, Deleted: ${wh.isDeleted || false}`);
        });

        // Find ALL inventory and filter
        console.log('\n📦 Inventory check:');
        const allInventory = await db.collection('inventories').find({}).limit(100).toArray();
        console.log(`Total inventories (sample): ${allInventory.length}\n`);

        const matchingInv = allInventory.filter(inv => {
            const invTenantId = inv.tenantId?.toString();
            return invTenantId === tenantId;
        });

        console.log(`Matching tenant ${tenantId}: ${matchingInv.length}\n`);

        // Group by warehouseId
        const byWarehouse = {};
        matchingInv.forEach(inv => {
            const whId = inv.warehouseId?.toString() || 'null';
            if (!byWarehouse[whId]) {
                byWarehouse[whId] = [];
            }
            byWarehouse[whId].push(inv);
        });

        console.log('Inventory grouped by warehouseId:\n');
        Object.entries(byWarehouse).forEach(([whId, items]) => {
            const warehouse = matching.find(w => w._id.toString() === whId);
            console.log(`  ${whId}: ${items.length} items - ${warehouse ? `✅ ${warehouse.name}` : '❌ NOT FOUND'}`);
            if (items.length > 0) {
                console.log(`    Sample: ${items[0].productName} (location: ${items[0].location?.warehouse})`);
            }
        });

    } finally {
        await client.close();
    }
}

directLookup().catch(console.error);
