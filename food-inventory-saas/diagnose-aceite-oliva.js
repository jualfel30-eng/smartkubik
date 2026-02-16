/**
 * Diagnostic script to investigate missing product issue
 * Product: "Aceite de Oliva E.V Al Reef 4lt"
 * Issue: Not appearing in POS or Inventory for Tiendas Broas
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
require('dotenv').config();

// Define schemas inline to avoid NestJS dependencies
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

const InventorySchema = new Schema({
    productId: Schema.Types.ObjectId,
    productSku: String,
    variantSku: String,
    isActive: Boolean,
    totalQuantity: Number,
    availableQuantity: Number,
    reservedQuantity: Number,
    tenantId: Schema.Types.ObjectId,
    location: {
        warehouse: String
    }
}, { timestamps: true, collection: 'inventories' });

async function diagnoseProduct() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const Product = mongoose.model('Product', ProductSchema);
        const Inventory = mongoose.model('Inventory', InventorySchema);

        const sku = 'Aceite de Oliva E.V Al Reef 4lt';

        console.log(`🔍 Searching for product with SKU: "${sku}"\n`);
        console.log('='.repeat(80));

        // 1. Check if product exists
        const product = await Product.findOne({ sku }).lean();

        if (!product) {
            console.log('❌ PRODUCT NOT FOUND');
            console.log('   The product does not exist in the database.');
            console.log('   Action needed: Create the product first.\n');
            return;
        }

        console.log('✅ PRODUCT FOUND\n');
        console.log('Product Details:');
        console.log(`   ID: ${product._id}`);
        console.log(`   Name: ${product.name}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   isActive: ${product.isActive}`);
        console.log(`   Tenant ID: ${product.tenantId}`);
        console.log(`   Product Type: ${product.productType || 'simple'}`);
        console.log(`   Category: ${product.category}`);
        console.log(`   Brand: ${product.brand}`);
        console.log(`   Variants: ${product.variants?.length || 0}`);

        if (product.variants && product.variants.length > 0) {
            console.log('\n   Variant Details:');
            product.variants.forEach((variant, idx) => {
                console.log(`     [${idx}] ${variant.name} - SKU: ${variant.sku} - Active: ${variant.isActive !== false}`);
            });
        }

        console.log('\n' + '='.repeat(80));

        // 2. Check inventory records
        console.log('\n🔍 Searching for inventory records...\n');

        const inventoryRecords = await Inventory.find({
            productId: product._id
        }).lean();

        if (inventoryRecords.length === 0) {
            console.log('❌ NO INVENTORY RECORDS FOUND');
            console.log('   Action needed: Create inventory for this product.\n');
        } else {
            console.log(`✅ FOUND ${inventoryRecords.length} INVENTORY RECORD(S)\n`);

            inventoryRecords.forEach((inv, idx) => {
                console.log(`Inventory Record #${idx + 1}:`);
                console.log(`   ID: ${inv._id}`);
                console.log(`   Product SKU: ${inv.productSku}`);
                console.log(`   Variant SKU: ${inv.variantSku || 'N/A'}`);
                console.log(`   isActive: ${inv.isActive}`);
                console.log(`   Total Quantity: ${inv.totalQuantity}`);
                console.log(`   Available Quantity: ${inv.availableQuantity}`);
                console.log(`   Reserved Quantity: ${inv.reservedQuantity}`);
                console.log(`   Tenant ID: ${inv.tenantId}`);
                console.log(`   Location: ${inv.location?.warehouse || 'N/A'}`);
                console.log('');
            });
        }

        console.log('='.repeat(80));
        console.log('\n📊 DIAGNOSIS SUMMARY\n');

        // Diagnosis
        const issues = [];

        if (product.isActive === false) {
            issues.push('⚠️  Product is INACTIVE (isActive: false)');
            issues.push('   Fix: Set product.isActive = true');
        }

        if (inventoryRecords.length === 0) {
            issues.push('⚠️  No inventory records exist');
            issues.push('   Fix: Create inventory record for this product');
        } else {
            const inactiveInventory = inventoryRecords.filter(inv => inv.isActive === false);
            if (inactiveInventory.length > 0) {
                issues.push(`⚠️  ${inactiveInventory.length} inventory record(s) are INACTIVE`);
                issues.push('   Fix: Set inventory.isActive = true');
            }

            const zeroQuantity = inventoryRecords.filter(inv => inv.totalQuantity === 0);
            if (zeroQuantity.length === inventoryRecords.length) {
                issues.push('⚠️  All inventory records have ZERO quantity');
                issues.push('   Note: This is OK, but product will show as out of stock');
            }
        }

        if (issues.length === 0) {
            console.log('✅ No obvious issues found!');
            console.log('   The product and inventory appear to be correctly configured.');
            console.log('   If still not appearing, check:');
            console.log('   - Frontend filters (category, search, etc.)');
            console.log('   - Tenant ID matching in frontend requests');
            console.log('   - Browser cache / hard refresh');
        } else {
            console.log('ISSUES FOUND:\n');
            issues.forEach(issue => console.log(issue));
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

diagnoseProduct();
