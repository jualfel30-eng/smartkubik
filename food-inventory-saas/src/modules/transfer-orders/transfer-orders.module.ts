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
import { TransferOrdersService } from "./transfer-orders.service";
import { TransferOrdersController } from "./transfer-orders.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TransferOrder.name, schema: TransferOrderSchema },
      { name: BusinessLocation.name, schema: BusinessLocationSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
    ]),
  ],
  controllers: [TransferOrdersController],
  providers: [TransferOrdersService],
  exports: [TransferOrdersService],
})
export class TransferOrdersModule {}
