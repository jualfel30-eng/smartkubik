/**
 * Search for product with similar name to "Aceite de Oliva E.V Al Reef 4lt"
 * Using fuzzy search to find variations
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
require('dotenv').config();

const ProductSchema = new Schema({
    sku: String,
    name: String,
    isActive: Boolean,
    tenantId: Schema.Types.ObjectId,
    productType: String,
    category: [String],
    brand: String,
    variants: [{
        name: String,
        sku: String,
        isActive: Boolean
    }]
}, { timestamps: true, collection: 'products' });

async function searchProduct() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB (test database)\n');

        const Product = mongoose.model('Product', ProductSchema);

        console.log('🔍 Searching for products containing "Aceite" and "Oliva"...\n');
        console.log('='.repeat(80));

        // Search by name or SKU containing keywords
        const products = await Product.find({
            $or: [
                { name: /aceite.*oliva/i },
                { sku: /aceite.*oliva/i },
                { name: /al reef/i },
                { sku: /al reef/i }
            ]
        }).lean();

        if (products.length === 0) {
            console.log('❌ NO PRODUCTS FOUND matching "Aceite", "Oliva", or "Al Reef"\n');
            console.log('Trying broader search for just "Aceite"...\n');

            const aceiteProducts = await Product.find({
                $or: [
                    { name: /aceite/i },
                    { sku: /aceite/i }
                ]
            }).limit(10).lean();

            if (aceiteProducts.length === 0) {
                console.log('❌ NO PRODUCTS FOUND containing "Aceite"\n');
                console.log('The product definitely does not exist in the database.\n');
            } else {
                console.log(`✅ Found ${aceiteProducts.length} products containing "Aceite":\n`);
                aceiteProducts.forEach((p, idx) => {
                    console.log(`${idx + 1}. SKU: "${p.sku}"`);
                    console.log(`   Name: "${p.name}"`);
                    console.log(`   Active: ${p.isActive}`);
                    console.log(`   Brand: ${p.brand || 'N/A'}`);
                    console.log('');
                });
            }
        } else {
            console.log(`✅ Found ${products.length} matching product(s):\n`);

            products.forEach((p, idx) => {
                console.log(`Product #${idx + 1}:`);
                console.log(`   ID: ${p._id}`);
                console.log(`   SKU: "${p.sku}"`);
                console.log(`   Name: "${p.name}"`);
                console.log(`   isActive: ${p.isActive}`);
                console.log(`   Brand: ${p.brand || 'N/A'}`);
                console.log(`   Tenant ID: ${p.tenantId}`);
                console.log(`   Variants: ${p.variants?.length || 0}`);

                if (p.variants && p.variants.length > 0) {
                    console.log('   Variant SKUs:');
                    p.variants.forEach((v, vidx) => {
                        console.log(`     [${vidx}] ${v.sku} - ${v.name} (Active: ${v.isActive !== false})`);
                    });
                }
                console.log('');
            });

            // Check if exact match exists
            const exactMatch = products.find(p =>
                p.sku === 'Aceite de Oliva E.V Al Reef 4lt' ||
                p.name === 'Aceite de Oliva E.V Al Reef 4lt'
            );

            if (exactMatch) {
                console.log('='.repeat(80));
                console.log('✅ EXACT MATCH FOUND!');
                console.log(`   SKU: "${exactMatch.sku}"`);
                console.log(`   This is the product you are looking for.`);
            } else {
                console.log('='.repeat(80));
                console.log('⚠️  NO EXACT MATCH');
                console.log('   Similar products found above, but none with exact SKU:');
                console.log('   "Aceite de Oliva E.V Al Reef 4lt"');
                console.log('\n   Possible reasons:');
                console.log('   - SKU has extra/missing spaces');
                console.log('   - Different capitalization');
                console.log('   - Product name is in "name" field, not "sku" field');
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

searchProduct();
