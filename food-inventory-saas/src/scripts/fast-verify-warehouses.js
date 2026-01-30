const { MongoClient, ObjectId } = require('mongodb');

// Ensure we get the URI from env or use a fallback if tested locally with a known string
const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error("❌ MONGODB_URI is not defined.");
    process.exit(1);
}

const tenantId = '68d55e4b764d359fed186e47';

async function run() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db();

        console.log(`\n🔌 Connected to DB: ${db.databaseName}`);
        console.log(`🔍 Checking Tenant: ${tenantId}`);

        // --- Check Warehouses ---
        const warehouses = await db.collection('warehouses').find({
            $or: [
                { tenantId: new ObjectId(tenantId) },
                { tenantId: tenantId }
            ]
        }).toArray();

        console.log(`\n🏭 Warehouses Found: ${warehouses.length}`);
        const validWarehouseIds = new Set();
        warehouses.forEach(w => {
            const isDefault = w.isDefault ? ' (DEFAULT)' : '';
            const status = w.isActive ? 'Active' : 'Inactive';
            console.log(`   - [${w._id}] ${w.name} ${isDefault} [${status}]`);
            validWarehouseIds.add(w._id.toString());
        });

        // --- Check Inventory ---
        const inventory = await db.collection('inventories').find({
            $or: [
                { tenantId: new ObjectId(tenantId) },
                { tenantId: tenantId }
            ]
        }).toArray();

        console.log(`\n📦 Inventory Items Found: ${inventory.length}`);

        const analysis = {
            valid: 0,
            orphaned: 0,
            nullWarehouse: 0,
            byWarehouse: {}
        };

        inventory.forEach(inv => {
            const whId = inv.warehouseId ? inv.warehouseId.toString() : null;

            if (!whId) {
                analysis.nullWarehouse++;
                // Optional: Log sample
                // console.log(`   ❌ Null Warehouse: ${inv.productName}`);
            } else if (validWarehouseIds.has(whId)) {
                analysis.valid++;
                analysis.byWarehouse[whId] = (analysis.byWarehouse[whId] || 0) + 1;
            } else {
                console.log(`   ⚠️  Orphaned Item: [${inv._id}] ${inv.productName} -> Warehouse ID: ${whId} (Not in list)`);
                analysis.orphaned++;
            }
        });

        console.log(`\n📊 Inventory Analysis:`);
        console.log(`   ✅ Valid Links: ${analysis.valid}`);
        console.log(`   ❌ Null Warehouse: ${analysis.nullWarehouse}`);
        console.log(`   ⚠️  Orphaned: ${analysis.orphaned}`);

        console.log(`\n   Distribution:`);
        Object.entries(analysis.byWarehouse).forEach(([whId, count]) => {
            const w = warehouses.find(x => x._id.toString() === whId);
            console.log(`   - ${w ? w.name : whId}: ${count} items`);
        });

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.close();
    }
}

run();
