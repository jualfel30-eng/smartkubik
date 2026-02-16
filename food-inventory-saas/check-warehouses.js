// Quick script to check warehouses for Tiendas Broas
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
const tenantId = '68d55e4b764d359fed186e47';

async function checkWarehouses() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();

        console.log(`\n🔍 Checking warehouses for tenant: ${tenantId}\n`);

        const { ObjectId } = require('mongodb');
        const warehouses = await db.collection('warehouses').find({
            $or: [
                { tenantId: tenantId },
                { tenantId: new ObjectId(tenantId) }
            ]
        }).toArray();

        console.log(`Found ${warehouses.length} warehouses:\n`);
        warehouses.forEach(wh => {
            console.log(`  - ${wh.code} | ${wh.name} | Active: ${wh.isActive} | Deleted: ${wh.isDeleted || false} | ID: ${wh._id}`);
        });

        console.log(`\n🔍 Checking inventory with warehouse "GEN":\n`);

        const inventory = await db.collection('inventories').find({
            $or: [
                { tenantId: tenantId },
                { tenantId: new ObjectId(tenantId) }
            ],
            'location.warehouse': 'GEN'
        }).limit(5).toArray();

        console.log(`Found ${inventory.length} inventory records with warehouse "GEN":\n`);
        inventory.forEach(inv => {
            console.log(`  - ${inv.productName} | warehouseId: ${inv.warehouseId} | location.warehouse: ${inv.location?.warehouse}`);
        });

    } finally {
        await client.close();
    }
}

checkWarehouses().catch(console.error);
