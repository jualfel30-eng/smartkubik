import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  Warehouse,
  WarehouseSchema,
  BinLocation,
  BinLocationSchema,
} from "../../schemas/warehouse.schema";
import { WarehousesService } from "./warehouses.service";
import { WarehousesController } from "./warehouses.controller";
import { BinLocationsService } from "./bin-locations.service";
import { BinLocationsController } from "./bin-locations.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: BinLocation.name, schema: BinLocationSchema },
    ]),
  ],
  controllers: [WarehousesController, BinLocationsController],
  providers: [WarehousesService, BinLocationsService],
  exports: [WarehousesService, BinLocationsService],
})
export class WarehousesModule {}
