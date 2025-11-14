import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { LocationsController } from "./locations.controller";
import { LocationsService } from "./locations.service";
import {
  DeliveryRates,
  DeliveryRatesSchema,
} from "../../schemas/delivery-rates.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeliveryRates.name, schema: DeliveryRatesSchema },
    ]),
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
