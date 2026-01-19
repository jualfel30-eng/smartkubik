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

    const tenantId = "6962b024c96f2d4a2370ebe4";
    const productId = "696d446e92f8ca63c6c77037"; // HAM-01-VAR1
    const productSku = "HAM-01-VAR1";
    const ingredientSku = "HAM-01"; // The one failing

    console.log("--- DEBUGGER START ---");
    console.log(`Checking Tenant: ${tenantId} `);

    try {
        const tenantModel = app.get(getModelToken(Tenant.name));
        const bomModel = app.get(getModelToken(BillOfMaterials.name));
        const inventoryModel = app.get(getModelToken(Inventory.name));

        // Check isFoodService logic
        const tenant = await tenantModel.findById(tenantId).exec();
        const isFoodService = tenant?.businessVertical === "food-service" || tenant?.baseVertical === "FOOD_SERVICE";
        console.log("isFoodService:", isFoodService);

        // Check BOM
        const bomExists = await bomModel.exists({
            productId: new Types.ObjectId(productId),
            isActive: true,
            tenantId: new Types.ObjectId(tenantId)
        });
        console.log("BOM Exists:", !!bomExists);

        if (bomExists) {
            const bom = await bomModel.findOne({
                productId: new Types.ObjectId(productId),
                isActive: true,
                tenantId: new Types.ObjectId(tenantId)
            });
            console.log("BOM found with components:", bom.components?.length);

            const productModel = app.get(getModelToken('Product')); // Check if accessible via string or import Product class
            // Accessing Product model might require importing the Schema/Class if generic string doesn't work with Nest/Mongoose setup in standalone.
            // But I saw `OrdersService` imports `Product`.
            // Let's print raw IDs first to avoid compilation issues with missing imports.

            console.log("--- BoM Components ---");
            for (const comp of bom.components) {
                console.log(`Component ID: ${comp.componentProductId}, Qty: ${comp.quantity} ${comp.unit}`);
            }
        }

        // CHECK INVENTORY FOR INGREDIENT
        console.log(`Checking Inventory for Ingredient SKU: ${ingredientSku}`);
        const inventoryItems = await inventoryModel.find({
            productSku: ingredientSku,
            tenantId: new Types.ObjectId(tenantId)
        }).exec();

        console.log("Inventory Records Found:", inventoryItems.length);
        if (inventoryItems.length > 0) {
            console.log("First Record:", JSON.stringify(inventoryItems[0], null, 2));
        } else {
            // Try strict string match if ObjectId failed?
            const inventoryItemsStr = await inventoryModel.find({
                productSku: ingredientSku,
                tenantId: tenantId
            }).exec();
            console.log("Inventory Records Found (String Tenant):", inventoryItemsStr.length);
        }

    } catch (error) {
        console.error("Error during debug:", error);
    }

    await app.close();
}

bootstrap();
