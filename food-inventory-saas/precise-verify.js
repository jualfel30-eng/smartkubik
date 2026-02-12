/**
 * Precise verification with exact search terms
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

async function preciseVerify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB (test database)\n');

        const Inventory = mongoose.model('Inventory', InventorySchema);

        const tenantId = '6984b426dad0fee93da83cfb';

        console.log('🔍 PRECISE VERIFICATION WITH MULTIPLE SEARCH TERMS\n');
        console.log('='.repeat(80));

        const allInventory = await Inventory.find({
            tenantId: new mongoose.Types.ObjectId(tenantId),
            isActive: { $ne: false }
        }).lean();

        console.log(`Total inventory records: ${allInventory.length}\n`);

        // Test multiple search terms
        const searchTerms = [
            'al reef 4lt',
            'aceite al reef',
            'e.v al reef',
            'oliva 4lt',
            'aceite de oliva 4lt'
        ];

        searchTerms.forEach(searchTerm => {
            const search = searchTerm.toLowerCase();
            const filtered = allInventory.filter((item) => {
                const candidates = [
                    item.productName,
                    item.productSku,
                    item.variantSku,
                ]
                    .filter(Boolean)
                    .map((value) => String(value).toLowerCase());

                return candidates.some((value) => value.includes(search));
            });

            const icon = filtered.length > 0 ? '✅' : '❌';
            console.log(`${icon} Search "${searchTerm}": ${filtered.length} result(s)`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('\n📋 CURRENT PRODUCT DATA:\n');

        const aceiteRecord = allInventory.find(item =>
            item.productSku?.includes('Aceite') &&
            item.productSku?.includes('Al Reef') &&
            item.productSku?.includes('4lt')
        );

        if (aceiteRecord) {
            console.log(`   Product Name: "${aceiteRecord.productName}"`);
            console.log(`   Product SKU: "${aceiteRecord.productSku}"`);
            console.log(`   Variant SKU: "${aceiteRecord.variantSku}"`);
            console.log(`   Available: ${aceiteRecord.availableQuantity} units`);
            console.log(`   isActive: ${aceiteRecord.isActive}`);
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

preciseVerify();
