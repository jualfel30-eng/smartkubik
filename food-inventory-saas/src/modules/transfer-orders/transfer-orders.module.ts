import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  TransferOrder,
  TransferOrderSchema,
} from "../../schemas/transfer-order.schema";
import {
  BusinessLocation,
  BusinessLocationSchema,
} from "../../schemas/business-location.schema";
import {
  Warehouse,
  WarehouseSchema,
} from "../../schemas/warehouse.schema";
import {
  Inventory,
  InventorySchema,
  InventoryMovement,
  InventoryMovementSchema,
} from "../../schemas/inventory.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { TransferOrdersService } from "./transfer-orders.service";
import { TransferOrdersController } from "./transfer-orders.controller";
import { OrganizationsModule } from "../organizations/organizations.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TransferOrder.name, schema: TransferOrderSchema },
      { name: BusinessLocation.name, schema: BusinessLocationSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    OrganizationsModule,
  ],
  controllers: [TransferOrdersController],
  providers: [TransferOrdersService],
  exports: [TransferOrdersService],
})
export class TransferOrdersModule {}
