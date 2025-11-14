import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SuppliesService } from "./supplies.service";
import { SuppliesController } from "./supplies.controller";
import {
  ProductSupplyConfig,
  ProductSupplyConfigSchema,
} from "../../schemas/product-supply-config.schema";
import {
  SupplyConsumptionLog,
  SupplyConsumptionLogSchema,
} from "../../schemas/supply-consumption-log.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ProductSupplyConfig.name,
        schema: ProductSupplyConfigSchema,
      },
      {
        name: SupplyConsumptionLog.name,
        schema: SupplyConsumptionLogSchema,
      },
      {
        name: Product.name,
        schema: ProductSchema,
      },
    ]),
  ],
  controllers: [SuppliesController],
  providers: [SuppliesService],
  exports: [SuppliesService],
})
export class SuppliesModule {}
