import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DeliveryService } from "./delivery.service";
import { DeliveryController } from "./delivery.controller";
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
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
