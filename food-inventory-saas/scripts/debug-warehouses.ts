
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { Warehouse } from "../src/schemas/warehouse.schema";
import { getModelToken } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const warehouseModel = app.get<Model<Warehouse>>(getModelToken(Warehouse.name));

    const tenantId = "68d55e4b764d359fed186e47"; // Tiendas Broas ID from logs
    console.log(`Checking warehouses for tenant: ${tenantId}`);

    const warehouses = await warehouseModel.find({
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: { $ne: true }
    }).lean();

    console.log(`Found ${warehouses.length} warehouses:`);
    warehouses.forEach(w => {
        console.log(`- [${w._id}] ${w.name} (Active: ${w.isActive})`);
    });

    await app.close();
    process.exit(0);
}

bootstrap();
