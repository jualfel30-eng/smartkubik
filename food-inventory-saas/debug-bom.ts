import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { OrdersService } from './src/modules/orders/orders.service';
import { Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Tenant } from './src/schemas/tenant.schema';
import { BillOfMaterials } from './src/schemas/bill-of-materials.schema';
import { Inventory } from './src/schemas/inventory.schema'; // Import Inventory


async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    console.log("--- DEBUGGER START ---");

    try {
        const productModel = app.get(getModelToken('Product'));
        const bomModel = app.get(getModelToken('BillOfMaterials'));

        // 1. Search for Hamburguesa products
        console.log("Searching for 'Hamburguesa' products...");
        const products = await productModel.find({
            name: { $regex: 'Hamburguesa', $options: 'i' },
            isActive: true
        }).limit(5).exec();

        console.log(`Found ${products.length} products.`);

        if (products.length === 0) {
            console.log("❌ No Hamburguesa products found!");
        }

        for (const product of products) {
            console.log(`\nProduct: ${product.name} (ID: ${product._id})`);

            // 2. Check BOM
            const bom = await bomModel.findOne({
                productId: product._id,
                isActive: true
            }).exec();

            if (bom) {
                console.log(`✅ BOM Found (ID: ${bom._id})`);
                console.log(`Components (${bom.components.length}):`);
                bom.components.forEach(c => {
                    console.log(` - ID: ${c.componentProductId}, Qty: ${c.quantity}`);
                });
            } else {
                console.log("❌ No Active BOM found.");

                // Check inactive?
                const inactiveBom = await bomModel.findOne({ productId: product._id }).exec();
                if (inactiveBom) console.log("   (Found inactive BOM)");
            }
        }

    } catch (error) {
        console.error("Error during debug:", error);
    }

    await app.close();
}

bootstrap();

