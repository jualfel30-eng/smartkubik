
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { ProductSchema } from '../src/schemas/product.schema';
import { TenantSchema } from '../src/schemas/tenant.schema';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    // Disable logging to clean output
    app.useLogger(false);

    const connection = app.get<Connection>(getConnectionToken());

    const TenantModel = connection.model('Tenant', TenantSchema) as any;
    const ProductModel = connection.model('Product', ProductSchema) as any;

    // 1. Find Tenant
    const tenants = await TenantModel.find({ name: /Broas/i }).exec();
    const tenant = tenants[0];
    console.log(`Analyzing Tenant: ${tenant.name}`);

    // 2. Count Total with Variants (Base check)
    const total = await ProductModel.countDocuments({ tenantId: tenant._id });
    console.log(`Total Products: ${total}`);

    // 3. Count Zero COST
    // Since variants is an array, we check if ANY variant has cost > 0
    // Or check if ALL variants have cost 0. 
    // Let's count products where at least one variant has costPrice > 0 (Good products)
    const goodCost = await ProductModel.countDocuments({
        tenantId: tenant._id,
        "variants.costPrice": { $gt: 0 }
    });
    console.log(`Products with Valid Cost (> 0): ${goodCost}`);

    const badCost = total - goodCost;
    console.log(`Products with ZERO/Missing Cost: ${badCost}`);

    // 4. Count Zero PRICE
    const goodPrice = await ProductModel.countDocuments({
        tenantId: tenant._id,
        "variants.basePrice": { $gt: 0 }
    });
    console.log(`Products with Valid Price (> 0): ${goodPrice}`);
    const badPrice = total - goodPrice;
    console.log(`Products with ZERO/Missing Price: ${badPrice}`);

    if (badCost > 0) {
        console.log("\nSAMPLE PRODUCTS WITH ZERO COST (First 5):");
        const zeros = await ProductModel.find({
            tenantId: tenant._id,
            $or: [
                { "variants.costPrice": 0 },
                { "variants.costPrice": { $exists: false } }
            ]
        }).limit(5).select('name variants').exec();

        zeros.forEach(p => {
            console.log(`- ${p.name}: Costs: [${p.variants.map(v => v.costPrice).join(', ')}]`);
        });
    }

    await app.close();
    process.exit(0);
}

bootstrap();
