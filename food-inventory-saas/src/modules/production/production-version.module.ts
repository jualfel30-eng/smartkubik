import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProductionVersionController } from "./production-version.controller";
import { ProductionVersionService } from "./production-version.service";
import {
  ProductionVersion,
  ProductionVersionSchema,
} from "../../schemas/production-version.schema";
import {
  BillOfMaterials,
  BillOfMaterialsSchema,
} from "../../schemas/bill-of-materials.schema";
import { Routing, RoutingSchema } from "../../schemas/routing.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductionVersion.name, schema: ProductionVersionSchema },
      { name: BillOfMaterials.name, schema: BillOfMaterialsSchema },
      { name: Routing.name, schema: RoutingSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    AuthModule,
  ],
  controllers: [ProductionVersionController],
  providers: [ProductionVersionService],
  exports: [ProductionVersionService],
})
export class ProductionVersionModule {}
