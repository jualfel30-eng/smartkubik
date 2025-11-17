import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MenuEngineeringController } from "./menu-engineering.controller";
import { MenuEngineeringService } from "./menu-engineering.service";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import {
  BillOfMaterials,
  BillOfMaterialsSchema,
} from "../../schemas/bill-of-materials.schema";
import { PermissionsModule } from "../permissions/permissions.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: BillOfMaterials.name, schema: BillOfMaterialsSchema },
    ]),
    PermissionsModule,
  ],
  controllers: [MenuEngineeringController],
  providers: [MenuEngineeringService],
  exports: [MenuEngineeringService],
})
export class MenuEngineeringModule {}
