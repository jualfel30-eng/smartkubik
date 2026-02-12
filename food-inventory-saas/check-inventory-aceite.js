/**
 * Check inventory for "Aceite de Oliva E.V  Al Reef 4lt" (with 2 spaces)
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
    location: {
        warehouse: String
    }
}, { timestamps: true, collection: 'inventories' });

async function checkInventory() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB (test database)\n');

        const Inventory = mongoose.model('Inventory', InventorySchema);

        const productId = '698b89c38ad8cf98c367324f'; // From search results
        const sku = 'Aceite de Oliva E.V  Al Reef 4lt'; // With 2 spaces

        console.log(`🔍 Checking inventory for product ID: ${productId}\n`);
        console.log('='.repeat(80));

        const inventoryRecords = await Inventory.find({
            $or: [
                { productId: new mongoose.Types.ObjectId(productId) },
                { productSku: sku },
                { productSku: /Aceite de Oliva E\.V.*Al Reef 4lt/i }
            ]
        }).lean();

        if (inventoryRecords.length === 0) {
            console.log('❌ NO INVENTORY RECORDS FOUND\n');
            console.log('The product exists but has no inventory records.');
            console.log('Action needed: Create inventory for this product.\n');
        } else {
            console.log(`✅ FOUND ${inventoryRecords.length} INVENTORY RECORD(S)\n`);

            inventoryRecords.forEach((inv, idx) => {
                console.log(`Inventory Record #${idx + 1}:`);
                console.log(`   ID: ${inv._id}`);
                console.log(`   Product ID: ${inv.productId}`);
                console.log(`   Product SKU: "${inv.productSku}"`);
                console.log(`   Product Name: "${inv.productName || 'N/A'}"`);
                console.log(`   Variant SKU: "${inv.variantSku || 'N/A'}"`);
                console.log(`   isActive: ${inv.isActive}`);
                console.log(`   Total Quantity: ${inv.totalQuantity}`);
                console.log(`   Available Quantity: ${inv.availableQuantity}`);
                console.log(`   Reserved Quantity: ${inv.reservedQuantity}`);
                console.log(`   Tenant ID: ${inv.tenantId}`);
                console.log(`   Location: ${inv.location?.warehouse || 'N/A'}`);
                console.log('');
            });

            // Diagnosis
            console.log('='.repeat(80));
            console.log('\n📊 DIAGNOSIS:\n');

            const inactiveRecords = inventoryRecords.filter(inv => inv.isActive === false);
            if (inactiveRecords.length > 0) {
                console.log(`⚠️  ${inactiveRecords.length} inventory record(s) are INACTIVE`);
                console.log('   This is why they don\'t appear in the inventory list.');
                console.log('   Solution: Reactivate the inventory records.\n');
            }

            const activeRecords = inventoryRecords.filter(inv => inv.isActive !== false);
            if (activeRecords.length > 0) {
                console.log(`✅ ${activeRecords.length} inventory record(s) are ACTIVE`);
                console.log('   These should appear in the inventory list.');
                console.log('   If not appearing, check:');
                console.log('   - Frontend search/filters');
                console.log('   - Tenant ID matching');
                console.log('   - Browser cache\n');
            }
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

checkInventory();
