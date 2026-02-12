/**
 * Check why productId populate is returning undefined
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

const ProductSchema = new Schema({
    sku: String,
    name: String,
    isActive: Boolean,
}, { timestamps: true, collection: 'products' });

async function checkPopulateIssue() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB (test database)\n');

        const Inventory = mongoose.model('Inventory', InventorySchema);
        const Product = mongoose.model('Product', ProductSchema);

        const inventoryId = '698b9cc6a2214bb9724c5ce5';

        console.log('🔍 Checking inventory record and its product reference\n');
        console.log('='.repeat(80));

        // Get inventory record
        const inventory = await Inventory.findById(inventoryId).lean();

        if (!inventory) {
            console.log('❌ Inventory record not found');
            return;
        }

        console.log('✅ Inventory Record:');
        console.log(`   ID: ${inventory._id}`);
        console.log(`   Product ID: ${inventory.productId}`);
        console.log(`   Product SKU: "${inventory.productSku}"`);
        console.log(`   Product Name: "${inventory.productName}"`);
        console.log('');

        // Try to find the product
        console.log('🔍 Looking for product with ID:', inventory.productId);
        console.log('');

        const product = await Product.findById(inventory.productId).lean();

        if (!product) {
            console.log('❌ PROBLEM FOUND: Product does NOT exist!');
            console.log('');
            console.log('The inventory record references a product ID that doesn\'t exist.');
            console.log('This is why populate returns undefined.');
            console.log('');
            console.log('SOLUTION:');
            console.log('1. The productId in inventory is pointing to a deleted/non-existent product');
            console.log('2. Need to update the inventory record to point to the correct product');
            console.log('');
            console.log('Searching for the actual product...');

            // Search for product by SKU
            const actualProduct = await Product.findOne({
                sku: /Aceite.*Al Reef.*4lt/i
            }).lean();

            if (actualProduct) {
                console.log('');
                console.log('✅ Found the actual product:');
                console.log(`   ID: ${actualProduct._id}`);
                console.log(`   SKU: "${actualProduct.sku}"`);
                console.log(`   Name: "${actualProduct.name}"`);
                console.log('');
                console.log('⚠️  MISMATCH DETECTED:');
                console.log(`   Inventory productId: ${inventory.productId}`);
                console.log(`   Actual product ID:   ${actualProduct._id}`);
                console.log('');
                console.log('This inventory record needs to be updated to point to the correct product.');
            } else {
                console.log('');
                console.log('❌ Could not find the actual product either');
                console.log('The product may have been deleted or never existed.');
            }
        } else {
            console.log('✅ Product found:');
            console.log(`   ID: ${product._id}`);
            console.log(`   SKU: "${product.sku}"`);
            console.log(`   Name: "${product.name}"`);
            console.log(`   isActive: ${product.isActive}`);
            console.log('');
            console.log('✅ No issue with populate - product exists and is linked correctly');
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

checkPopulateIssue();
