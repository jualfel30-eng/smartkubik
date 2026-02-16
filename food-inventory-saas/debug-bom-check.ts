
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./src/app.module";
import { BillOfMaterialsService } from "./src/modules/production/bill-of-materials/bill-of-materials.service";
import { ProductsService } from "./src/modules/products/products.service";
import { Types } from "mongoose";

async function checkBOM() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const bomService = app.get(BillOfMaterialsService);
    const productsService = app.get(ProductsService);

    // 1. Find a product that should have a BOM
    // We know we added 'Hamburguesa Clásica'
    const products = await productsService.findAll({}, {
        name: { $regex: 'Hamburguesa', $options: 'i' }
    });

    if (products.length === 0) {
        console.log("No 'Hamburguesa' products found!");
        await app.close();
        return;
    }

    const product = products[0];
    console.log(`Checking BOM for Product: ${product.name} (${product._id}) Tenant: ${product.tenantId}`);

    // 2. Try to find BOM by productId
    // Mock user for tenant access
    const user = { tenantId: product.tenantId };

    const bom = await bomService.findByProduct(product._id.toString(), user);

    if (bom) {
        console.log("✅ BOM Found:");
        console.log(`ID: ${bom._id}`);
        console.log(`Components (${bom.components.length}):`);
        bom.components.forEach(c => {
            console.log(` - ProductID: ${c.componentProductId}, Qty: ${c.quantity} ${c.unit}`);
        });
    } else {
        console.log("❌ No BOM found for this product.");
    }

    await app.close();
}

checkBOM();
