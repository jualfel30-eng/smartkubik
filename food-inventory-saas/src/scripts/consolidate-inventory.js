const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("❌ MONGODB_URI is not defined.");
    process.exit(1);
}

// Configuration
const TENANT_ID = '68d55e4b764d359fed186e47';
const SOURCE_WH_ID = '694610cb7f2a6ec7ccb2d19b'; // General
const TARGET_WH_ID = '696b8d07863870fa10a63f2d'; // ALMACEN RECEPCIÓN (ALM-001)

async function run() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();
        console.log(`🔌 Connected to DB: ${db.databaseName}`);
        console.log(`🎯 Consolidating inventory for Tenant: ${TENANT_ID}`);
        console.log(`   Source (GEN): ${SOURCE_WH_ID}`);
        console.log(`   Target (ALM-001): ${TARGET_WH_ID}`);

        const session = client.startSession();

        try {
            await session.withTransaction(async () => {
                const inventoriesCollection = db.collection('inventories');
                const warehousesCollection = db.collection('warehouses');

                // 1. Get all items from Source
                const sourceItems = await inventoriesCollection.find({
                    warehouseId: new ObjectId(SOURCE_WH_ID),
                    tenantId: new ObjectId(TENANT_ID)
                }).toArray();

                console.log(`\n📦 Found ${sourceItems.length} items in Source Warehouse.`);

                for (const item of sourceItems) {
                    console.log(`   Processing: ${item.productName} (Qty: ${item.availableQuantity})`);

                    // 2. Check for duplicate in Target
                    const targetItem = await inventoriesCollection.findOne({
                        warehouseId: new ObjectId(TARGET_WH_ID),
                        productId: item.productId, // Match by Product ID
                        // variantId: item.variantId // TODO: Consider variant if applicable
                        tenantId: new ObjectId(TENANT_ID)
                    });

                    if (targetItem) {
                        console.log(`      Found existing item in Target (Qty: ${targetItem.availableQuantity}). Merging...`);

                        // Merge: Add source qty to target
                        const newQty = (targetItem.availableQuantity || 0) + (item.availableQuantity || 0);

                        await inventoriesCollection.updateOne(
                            { _id: targetItem._id },
                            { $set: { availableQuantity: newQty } },
                            { session }
                        );

                        // Delete source item
                        await inventoriesCollection.deleteOne(
                            { _id: item._id },
                            { session }
                        );
                        console.log(`      ✅ Merged. New Target Qty: ${newQty}. Source item deleted.`);
                    } else {
                        console.log(`      No existing item in Target. Moving...`);

                        // Move: Update warehouseId
                        await inventoriesCollection.updateOne(
                            { _id: item._id },
                            { $set: { warehouseId: new ObjectId(TARGET_WH_ID) } },
                            { session }
                        );
                        console.log(`      ✅ Moved to Target.`);
                    }
                }

                // 3. Deactivate Source Warehouse and Ensure Target is Default
                console.log(`\n🏭 Updating Warehouse Configuration...`);

                // Deactivate Source (General)
                await warehousesCollection.updateOne(
                    { _id: new ObjectId(SOURCE_WH_ID) },
                    { $set: { isActive: false, isDefault: false } },
                    { session }
                );
                console.log(`   🔸 'General' warehouse deactivated and unchecked as default.`);

                // Ensure Target (ALM-001) is Default
                await warehousesCollection.updateOne(
                    { _id: new ObjectId(TARGET_WH_ID) },
                    { $set: { isActive: true, isDefault: true } },
                    { session }
                );
                console.log(`   🔹 'ALMACEN RECEPCIÓN' confirmed as Default and Active.`);

            });
            console.log(`\n✨ Consolidation completed successfully.`);

        } catch (txError) {
            console.error("❌ Transaction failed:", txError);
            throw txError;
        } finally {
            await session.endSession();
        }

    } catch (err) {
        console.error("❌ Script error:", err);
    } finally {
        await client.close();
    }
}

run();
