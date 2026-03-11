import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
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
} from "../../schemas/inventory.schema";
import { BusinessLocationsService } from "./business-locations.service";
import { BusinessLocationsController } from "./business-locations.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BusinessLocation.name, schema: BusinessLocationSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Inventory.name, schema: InventorySchema },
    ]),
  ],
  controllers: [BusinessLocationsController],
  providers: [BusinessLocationsService],
  exports: [BusinessLocationsService],
})
export class BusinessLocationsModule {}
