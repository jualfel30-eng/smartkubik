/**
 * FIX SCRIPT: Update inventory productName to match actual product name
 * This ensures the frontend can properly display and filter the product
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
}, { timestamps: true, collection: 'inventories' });

const ProductSchema = new Schema({
    sku: String,
    name: String,
    isActive: Boolean,
}, { timestamps: true, collection: 'products' });

async function fixInventoryProductName() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB (test database)\n');

        const Inventory = mongoose.model('Inventory', InventorySchema);
        const Product = mongoose.model('Product', ProductSchema);

        const inventoryId = '698b9cc6a2214bb9724c5ce5';
        const productId = '698b89c38ad8cf98c367324f';

        console.log('🔧 FIXING INVENTORY RECORD\n');
        console.log('='.repeat(80));

        // Get current state
        const inventory = await Inventory.findById(inventoryId);
        const product = await Product.findById(productId);

        if (!inventory || !product) {
            console.log('❌ Inventory or Product not found');
            return;
        }

        console.log('BEFORE FIX:');
        console.log(`   Inventory productName: "${inventory.productName}"`);
        console.log(`   Actual product name:   "${product.name}"`);
        console.log('');

        // Update inventory productName to match product name exactly
        inventory.productName = `${product.name} - Estándar`;

        // Also ensure productSku matches
        console.log(`   Inventory productSku: "${inventory.productSku}"`);
        console.log(`   Inventory variantSku: "${inventory.variantSku}"`);
        console.log('');

        await inventory.save();

        console.log('✅ FIXED!');
        console.log('');
        console.log('AFTER FIX:');
        console.log(`   Inventory productName: "${inventory.productName}"`);
        console.log('');
        console.log('The inventory record has been updated.');
        console.log('The product should now appear correctly in the frontend.');
        console.log('');
        console.log('⚠️  IMPORTANT: Refresh the browser to see the changes!');

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

fixInventoryProductName();
