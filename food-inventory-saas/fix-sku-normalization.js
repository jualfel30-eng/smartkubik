/**
 * DEFINITIVE FIX: Normalize product and inventory SKUs
 * Remove extra spaces to make it searchable
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
require('dotenv').config();

const ProductSchema = new Schema({
    sku: String,
    name: String,
    isActive: Boolean,
    variants: [{
        sku: String,
        name: String
    }]
}, { timestamps: true, collection: 'products' });

const InventorySchema = new Schema({
    productId: Schema.Types.ObjectId,
    productSku: String,
    variantSku: String,
    productName: String,
}, { timestamps: true, collection: 'inventories' });

async function fixSKUs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB (test database)\n');

        const Product = mongoose.model('Product', ProductSchema);
        const Inventory = mongoose.model('Inventory', InventorySchema);

        const productId = '698b89c38ad8cf98c367324f';
        const inventoryId = '698b9cc6a2214bb9724c5ce5';

        console.log('🔧 DEFINITIVE FIX: Normalizing SKUs\n');
        console.log('='.repeat(80));

        // Get records
        const product = await Product.findById(productId);
        const inventory = await Inventory.findById(inventoryId);

        if (!product || !inventory) {
            console.log('❌ Records not found');
            return;
        }

        console.log('BEFORE FIX:');
        console.log(`   Product SKU: "${product.sku}"`);
        console.log(`   Product Name: "${product.name}"`);
        console.log(`   Variant SKU: "${product.variants[0]?.sku}"`);
        console.log(`   Inventory productSku: "${inventory.productSku}"`);
        console.log(`   Inventory variantSku: "${inventory.variantSku}"`);
        console.log(`   Inventory productName: "${inventory.productName}"`);
        console.log('');

        // Normalize SKUs (remove double spaces)
        const normalizedSKU = 'Aceite de Oliva E.V Al Reef 4lt';
        const normalizedVariantSKU = 'Aceite de Oliva E.V Al Reef 4lt-VAR1';
        const normalizedName = 'Aceite de Oliva E.V Al Reef 4lt';

        // Update product
        product.sku = normalizedSKU;
        product.name = normalizedName;
        if (product.variants && product.variants[0]) {
            product.variants[0].sku = normalizedVariantSKU;
        }
        await product.save();

        // Update inventory
        inventory.productSku = normalizedVariantSKU;
        inventory.variantSku = normalizedVariantSKU;
        inventory.productName = `${normalizedName} - Estándar`;
        await inventory.save();

        console.log('✅ FIXED!');
        console.log('');
        console.log('AFTER FIX:');
        console.log(`   Product SKU: "${product.sku}"`);
        console.log(`   Product Name: "${product.name}"`);
        console.log(`   Variant SKU: "${product.variants[0]?.sku}"`);
        console.log(`   Inventory productSku: "${inventory.productSku}"`);
        console.log(`   Inventory variantSku: "${inventory.variantSku}"`);
        console.log(`   Inventory productName: "${inventory.productName}"`);
        console.log('');
        console.log('✅ SKUs normalized - extra spaces removed');
        console.log('✅ Product should now be searchable with:');
        console.log('   - "Aceite Al Reef"');
        console.log('   - "Al Reef 4lt"');
        console.log('   - "Aceite de Oliva 4lt"');
        console.log('');
        console.log('⚠️  IMPORTANT: Refresh the browser (Cmd+Shift+R) to see changes!');

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

fixSKUs();
