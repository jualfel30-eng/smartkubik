import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Inventory } from '../schemas/inventory.schema';
import { Product } from '../schemas/product.schema';

/**
 * Migration Script: Fix Inventory Records with Null ProductId
 * 
 * This script finds inventory records where productId is null but variantId exists,
 * and updates them with the correct productId by looking up the variant's parent product.
 * 
 * Usage: npm run migrate:fix-null-product-ids
 */
async function fixNullProductIds() {
    console.log('🚀 Starting null productId fix...\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryModel = app.get<Model<Inventory>>(getModelToken(Inventory.name));
    const productModel = app.get<Model<Product>>(getModelToken(Product.name));

    try {
        // Find all inventory records with null productId but valid variantId
        const inventoryWithNullProductId = await inventoryModel.find({
            productId: null,
            variantId: { $exists: true, $ne: null },
        }).lean();

        console.log(`📦 Found ${inventoryWithNullProductId.length} inventory records with null productId\n`);

        if (inventoryWithNullProductId.length === 0) {
            console.log('✅ No inventory records need fixing!');
            await app.close();
            return;
        }

        let totalFixed = 0;
        let totalFailed = 0;

        for (const inv of inventoryWithNullProductId) {
            try {
                // Find the product that contains this variant
                const product = await productModel.findOne({
                    'variants._id': inv.variantId,
                }).lean();

                if (product) {
                    // Update the inventory record with the correct productId
                    await inventoryModel.updateOne(
                        { _id: inv._id },
                        { $set: { productId: product._id } }
                    );

                    console.log(`✅ Fixed: ${inv.productName} (${inv.productSku}) -> productId: ${product._id}`);
                    totalFixed++;
                } else {
                    console.warn(`⚠️  No product found for variant ${inv.variantId} (${inv.productName})`);
                    totalFailed++;
                }
            } catch (error) {
                console.error(`❌ Error fixing inventory ${inv._id}:`, error.message);
                totalFailed++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log(`   ✅ Fixed: ${totalFixed}`);
        console.log(`   ❌ Failed: ${totalFailed}`);
        console.log(`   📦 Total: ${inventoryWithNullProductId.length}`);
        console.log('='.repeat(60) + '\n');

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

fixNullProductIds()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
