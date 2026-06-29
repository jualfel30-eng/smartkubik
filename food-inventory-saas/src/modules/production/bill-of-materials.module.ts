import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BillOfMaterialsController } from "./bill-of-materials.controller";
import { BillOfMaterialsService } from "./bill-of-materials.service";
import {
  BillOfMaterials,
  BillOfMaterialsSchema,
} from "../../schemas/bill-of-materials.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { AuthModule } from "../../auth/auth.module";
import { InventoryModule } from "../inventory/inventory.module";
import { ModuleAccessGuard } from "../../guards/module-access.guard";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BillOfMaterials.name, schema: BillOfMaterialsSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    forwardRef(() => AuthModule),
    InventoryModule,
  ],
  controllers: [BillOfMaterialsController],
  providers: [BillOfMaterialsService, ModuleAccessGuard],
  exports: [BillOfMaterialsService],
})
export class BillOfMaterialsModule {}
