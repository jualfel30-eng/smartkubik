/**
 * FINAL VERIFICATION: Check if product appears in frontend query
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
}, { timestamps: true, collection: 'inventories' });

async function verifyFix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB (test database)\n');

        const Inventory = mongoose.model('Inventory', InventorySchema);

        const tenantId = '6984b426dad0fee93da83cfb';

        console.log('🔍 FINAL VERIFICATION\n');
        console.log('='.repeat(80));
        console.log('Simulating frontend search for "Aceite Al Reef 4lt"...\n');

        // Simulate frontend filter
        const searchTerm = 'aceite al reef 4lt';

        const allInventory = await Inventory.find({
            tenantId: new mongoose.Types.ObjectId(tenantId),
            isActive: { $ne: false }
        }).lean();

        console.log(`Total inventory records: ${allInventory.length}\n`);

        // Filter like frontend does
        const filtered = allInventory.filter((item) => {
            const candidates = [
                item.productName,
                item.productSku,
                item.variantSku,
            ]
                .filter(Boolean)
                .map((value) => String(value).toLowerCase());

            return candidates.some((value) => value.includes(searchTerm));
        });

        console.log(`Filtered results for "${searchTerm}": ${filtered.length}\n`);

        if (filtered.length > 0) {
            console.log('✅ SUCCESS! Product WILL appear in frontend:\n');
            filtered.forEach((item, idx) => {
                console.log(`Result #${idx + 1}:`);
                console.log(`   Product Name: "${item.productName}"`);
                console.log(`   Product SKU: "${item.productSku}"`);
                console.log(`   Variant SKU: "${item.variantSku}"`);
                console.log(`   Available: ${item.availableQuantity}`);
                console.log('');
            });
            console.log('✅ The product should now be visible in both Inventory and POS!');
            console.log('⚠️  Remember to REFRESH the browser (Cmd+Shift+R)');
        } else {
            console.log('❌ Product still not appearing in search results');
            console.log('\nLet me check what searches WOULD work:\n');

            const aceiteRecord = allInventory.find(item =>
                item.productSku?.includes('Aceite') &&
                item.productSku?.includes('Al Reef') &&
                item.productSku?.includes('4lt')
            );

            if (aceiteRecord) {
                console.log('Found the record. Try searching for:');
                console.log(`   - "${aceiteRecord.productSku}"`);
                console.log(`   - "${aceiteRecord.productName}"`);
                console.log(`   - "Al Reef 4lt"`);
                console.log(`   - "E.V  4lt" (with 2 spaces)`);
            }
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

verifyFix();
