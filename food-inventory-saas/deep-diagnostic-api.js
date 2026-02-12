/**
 * Deep diagnostic: Check API response for inventory list
 * This will show exactly what the frontend is receiving
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
require('dotenv').config();

const InventorySchema = new Schema({
    productId: Schema.Types.ObjectId,
    productSku: String,
    variantSku: String,
    productName: String,
    isActive: Boolean,
    totalQuantity: Number,
    availableQuantity: Number,
    reservedQuantity: Number,
    tenantId: Schema.Types.ObjectId,
}, { timestamps: true, collection: 'inventories' });

const ProductSchema = new Schema({
    sku: String,
    name: String,
    isActive: Boolean,
    tenantId: Schema.Types.ObjectId,
}, { timestamps: true, collection: 'products' });

async function checkAPIResponse() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB (test database)\n');

        const Inventory = mongoose.model('Inventory', InventorySchema);
        const Product = mongoose.model('Product', ProductSchema);

        const tenantId = '6984b426dad0fee93da83cfb'; // Tiendas Broas

        console.log('🔍 Simulating API call: GET /api/v1/inventory\n');
        console.log('='.repeat(80));

        // Simulate the exact query the API makes
        const filter = {
            tenantId: new mongoose.Types.ObjectId(tenantId),
            isActive: { $ne: false }
        };

        console.log('Query filter:', JSON.stringify(filter, null, 2));
        console.log('');

        const inventoryRecords = await Inventory.find(filter)
            .sort({ updatedAt: -1 })
            .limit(100)
            .populate('productId', 'name category brand isPerishable variants')
            .lean();

        console.log(`📦 Total inventory records found: ${inventoryRecords.length}\n`);

        // Search for our specific product
        const aceiteRecords = inventoryRecords.filter(inv =>
            inv.productSku?.includes('Aceite') &&
            inv.productSku?.includes('Al Reef') &&
            inv.productSku?.includes('4lt')
        );

        if (aceiteRecords.length === 0) {
            console.log('❌ "Aceite de Oliva Al Reef 4lt" NOT FOUND in API response\n');
            console.log('Checking why...\n');

            // Check if it exists but doesn't match filter
            const allAceiteRecords = await Inventory.find({
                tenantId: new mongoose.Types.ObjectId(tenantId),
                productSku: /Aceite.*Al Reef.*4lt/i
            }).lean();

            if (allAceiteRecords.length > 0) {
                console.log(`⚠️  Found ${allAceiteRecords.length} record(s) without isActive filter:\n`);
                allAceiteRecords.forEach((inv, idx) => {
                    console.log(`Record #${idx + 1}:`);
                    console.log(`   Product SKU: "${inv.productSku}"`);
                    console.log(`   isActive: ${inv.isActive}`);
                    console.log(`   Total Quantity: ${inv.totalQuantity}`);
                    console.log(`   Available: ${inv.availableQuantity}`);
                    console.log(`   REASON: isActive is ${inv.isActive}, should be true or undefined`);
                    console.log('');
                });
            } else {
                console.log('❌ Product not found even without filters');
                console.log('   This means the productSku in inventory doesn\'t match the search pattern\n');

                // Show what the actual SKU is
                const exactRecord = await Inventory.findOne({
                    productId: new mongoose.Types.ObjectId('698b89c38ad8cf98c367324f')
                }).lean();

                if (exactRecord) {
                    console.log('Actual inventory record:');
                    console.log(`   Product SKU: "${exactRecord.productSku}"`);
                    console.log(`   Variant SKU: "${exactRecord.variantSku}"`);
                    console.log(`   Product Name: "${exactRecord.productName}"`);
                    console.log(`   isActive: ${exactRecord.isActive}`);
                    console.log('');
                }
            }
        } else {
            console.log(`✅ FOUND ${aceiteRecords.length} matching record(s) in API response:\n`);
            aceiteRecords.forEach((inv, idx) => {
                console.log(`Record #${idx + 1}:`);
                console.log(`   ID: ${inv._id}`);
                console.log(`   Product SKU: "${inv.productSku}"`);
                console.log(`   Variant SKU: "${inv.variantSku || 'N/A'}"`);
                console.log(`   Product Name: "${inv.productName || 'N/A'}"`);
                console.log(`   isActive: ${inv.isActive}`);
                console.log(`   Total: ${inv.totalQuantity}, Available: ${inv.availableQuantity}`);
                console.log(`   Product populated: ${inv.productId ? 'Yes' : 'No'}`);
                if (inv.productId) {
                    console.log(`   Product name from populate: "${inv.productId.name}"`);
                    console.log(`   Product isActive: ${inv.productId.isActive}`);
                }
                console.log('');
            });
        }

        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

checkAPIResponse();
