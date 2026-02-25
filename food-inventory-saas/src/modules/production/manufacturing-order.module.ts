import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ManufacturingOrderController } from "./manufacturing-order.controller";
import { ManufacturingOrderService } from "./manufacturing-order.service";
import { MRPController } from "./mrp.controller";
import { MRPService } from "./mrp.service";
import { BillOfMaterialsModule } from "./bill-of-materials.module";
import {
  ManufacturingOrder,
  ManufacturingOrderSchema,
} from "../../schemas/manufacturing-order.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import {
  ProductionVersion,
  ProductionVersionSchema,
} from "../../schemas/production-version.schema";
import {
  BillOfMaterials,
  BillOfMaterialsSchema,
} from "../../schemas/bill-of-materials.schema";
import { Routing, RoutingSchema } from "../../schemas/manufacturing-routing.schema";
import { WorkCenter, WorkCenterSchema } from "../../schemas/work-center.schema";
import { Inventory, InventorySchema } from "../../schemas/inventory.schema";
import { AuthModule } from "../../auth/auth.module";
import { InventoryModule } from "../inventory/inventory.module";
import { AccountingModule } from "../accounting/accounting.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ManufacturingOrder.name, schema: ManufacturingOrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductionVersion.name, schema: ProductionVersionSchema },
      { name: BillOfMaterials.name, schema: BillOfMaterialsSchema },
      { name: Routing.name, schema: RoutingSchema },
      { name: WorkCenter.name, schema: WorkCenterSchema },
      { name: Inventory.name, schema: InventorySchema },
    ]),
    forwardRef(() => AuthModule),
    InventoryModule,
    AccountingModule,
    BillOfMaterialsModule, // Para acceder a BillOfMaterialsService
  ],
  controllers: [ManufacturingOrderController, MRPController],
  providers: [ManufacturingOrderService, MRPService],
  exports: [ManufacturingOrderService, MRPService],
})
export class ManufacturingOrderModule {}
