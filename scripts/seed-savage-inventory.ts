import { MongoClient, ObjectId } from 'mongodb';

// CONFIGURATION
const TENANT_ID = '68f59eda273377a751571e66';
const USER_ID = '68f59edb273377a751571e88';
const WAREHOUSE_ID = '694610d07f2a6ec7ccb2d220'; // General Warehouse
const MONGO_URI = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function seedInventory() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db('test');

        // 0. CLEANUP EXISTING INVENTORY
        console.log(`Clearing all inventory for tenant ${TENANT_ID}...`);
        const delResult = await db.collection('inventories').deleteMany({
            tenantId: new ObjectId(TENANT_ID)
        });
        console.log(`Deleted ${delResult.deletedCount} existing inventory records.`);

        // 1. Get all products for this tenant
        const products = await db.collection('products').find({
            tenantId: new ObjectId(TENANT_ID)
        }).toArray();

        console.log(`Found ${products.length} products to inventory.`);

        let inventoryCount = 0;

        for (const product of products) {
            // For each variant, create an inventory record
            if (product.variants && product.variants.length > 0) {
                for (const variant of product.variants) {
                    // Check if inventory already exists
                    const existing = await db.collection('inventories').findOne({
                        tenantId: new ObjectId(TENANT_ID),
                        productId: product._id,
                        variantId: variant._id
                    });

                    if (existing) {
                        console.log(`Inventory exists for ${product.name} - ${variant.name}, skipping...`);
                        continue;
                    }

                    // Create Inventory Lot
                    const lotId = new ObjectId();
                    const inventoryLot = {
                        _id: lotId,
                        lotNumber: `LOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        quantity: 100,
                        availableQuantity: 100,
                        reservedQuantity: 0,
                        costPrice: variant.costPrice,
                        receivedDate: new Date(),
                        status: 'available',
                        createdBy: new ObjectId(USER_ID)
                    };

                    // Create Inventory Record
                    const inventory = {
                        productId: product._id,
                        productSku: product.sku,
                        productName: product.name,
                        variantId: variant._id,
                        variantSku: variant.sku,
                        // Link to specific Warehouse
                        warehouseId: new ObjectId(WAREHOUSE_ID),
                        totalQuantity: 100,
                        availableQuantity: 100,
                        reservedQuantity: 0,
                        committedQuantity: 0,
                        averageCostPrice: variant.costPrice,
                        lastCostPrice: variant.costPrice,
                        lots: [inventoryLot],
                        location: {
                            warehouse: 'General', // Updated name match
                            zone: 'A',
                            aisle: '1',
                            shelf: '1',
                            bin: 'A1'
                        },
                        alerts: {
                            lowStock: false,
                            nearExpiration: false,
                            expired: false,
                            overstock: false
                        },
                        isActive: true,
                        createdBy: new ObjectId(USER_ID),
                        updatedBy: new ObjectId(USER_ID),
                        tenantId: new ObjectId(TENANT_ID),
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };

                    await db.collection('inventories').insertOne(inventory);
                    inventoryCount++;
                    console.log(`Created inventory for ${product.name} [${variant.name}]`);
                }
            }
        }

        console.log(`\n✅ Successfully seeded ${inventoryCount} inventory records.`);

    } catch (error) {
        console.error('❌ Error seeding inventory:', error);
    } finally {
        await client.close();
    }
}

seedInventory();
