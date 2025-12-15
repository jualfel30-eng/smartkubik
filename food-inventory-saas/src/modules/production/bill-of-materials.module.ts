import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BillOfMaterialsController } from "./bill-of-materials.controller";
import { BillOfMaterialsService } from "./bill-of-materials.service";
import {
  BillOfMaterials,
  BillOfMaterialsSchema,
} from "../../schemas/bill-of-materials.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { AuthModule } from "../../auth/auth.module";
import { InventoryModule } from "../inventory/inventory.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BillOfMaterials.name, schema: BillOfMaterialsSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    forwardRef(() => AuthModule),
    InventoryModule,
  ],
  controllers: [BillOfMaterialsController],
  providers: [BillOfMaterialsService],
  exports: [BillOfMaterialsService],
})
export class BillOfMaterialsModule {}
