// Check actual warehouse IDs for Tiendas Broas
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
const tenantId = '68d55e4b764d359fed186e47';

async function checkWarehouseIds() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();

        console.log(`\n🔍 Checking warehouses for Tiendas Broas (${tenantId})\n`);

        // Find all warehouses for this tenant
        const warehouses = await db.collection('warehouses').find({
            $or: [
                { tenantId: tenantId },
                { tenantId: new ObjectId(tenantId) }
            ]
        }).toArray();

        console.log(`Found ${warehouses.length} warehouses:\n`);
        warehouses.forEach(wh => {
            console.log(`  ID: ${wh._id}`);
            console.log(`  Code: ${wh.code}`);
            console.log(`  Name: ${wh.name}`);
            console.log(`  Active: ${wh.isActive}`);
            console.log(`  Deleted: ${wh.isDeleted || false}`);
            console.log(`  Default: ${wh.isDefault || false}`);
            console.log(`  ---`);
        });

        console.log(`\n🔍 Checking inventory warehouseId values:\n`);

        // Get unique warehouseId values from inventory
        const inventoryWarehouseIds = await db.collection('inventories').distinct('warehouseId', {
            $or: [
                { tenantId: tenantId },
                { tenantId: new ObjectId(tenantId) }
            ]
        });

        console.log(`Found ${inventoryWarehouseIds.length} unique warehouseId values in inventory:\n`);

        for (const whId of inventoryWarehouseIds) {
            const count = await db.collection('inventories').countDocuments({
                $or: [
                    { tenantId: tenantId },
                    { tenantId: new ObjectId(tenantId) }
                ],
                warehouseId: whId
            });

            const warehouse = warehouses.find(w => w._id.toString() === whId?.toString());

            console.log(`  ${whId} - ${count} items - ${warehouse ? `✅ ${warehouse.name}` : '❌ NOT FOUND'}`);
        }

    } finally {
        await client.close();
    }
}

checkWarehouseIds().catch(console.error);
