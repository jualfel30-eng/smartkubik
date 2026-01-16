// @ts-nocheck
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
import mongoose from 'mongoose';
import { ProductSchema } from '../src/schemas/product.schema';
import { TenantSchema } from '../src/schemas/tenant.schema';

async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food-inventory';
    console.log('Connecting to DB...');
    await mongoose.connect(uri);

    const Product = mongoose.model('Product', ProductSchema);
    const Tenant = mongoose.model('Tenant', TenantSchema);

    // Find Tenant
    const tenant = await Tenant.findOne({ name: /Broas/i });
    if (!tenant) { console.log('Tenant not found'); return; }

    // Find the problematic product
    const sku = "Sal parrillera SALDI 20 kg-VAR1"; // From previous output
    console.log(`Looking for SKU variant: ${sku}`);

    // We search by "variants.sku"
    const product = await Product.findOne({
        tenantId: tenant._id,
        "variants.sku": sku
    }).lean();

    if (!product) {
        console.log("Product not found by variant SKU. Trying by name...");
        const prodByName = await Product.findOne({
            tenantId: tenant._id,
            name: /Sal parrillera SALDI/i
        }).lean();

        if (prodByName) {
            console.log("Found by name:", JSON.stringify(prodByName, null, 2));
        } else {
            console.log("Not found.");
        }
    } else {
        console.log("Found Product:", JSON.stringify(product, null, 2));
    }

    await mongoose.disconnect();
}

run();
