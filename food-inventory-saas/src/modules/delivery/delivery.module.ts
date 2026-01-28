import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DeliveryService } from "./delivery.service";
import { DeliveryController } from "./delivery.controller";
import { DeliveryPublicController } from "./delivery-public.controller";
import { ShippingProvidersController } from "./shipping-providers.controller";
import { ShippingProvidersService } from "./shipping-providers.service";
import {
  DeliveryRates,
  DeliveryRatesSchema,
} from "../../schemas/delivery-rates.schema";
import {
  ShippingProvider,
  ShippingProviderSchema,
} from "../../schemas/shipping-provider.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeliveryRates.name, schema: DeliveryRatesSchema },
      { name: ShippingProvider.name, schema: ShippingProviderSchema },
    ]),
  ],
  controllers: [DeliveryController, DeliveryPublicController, ShippingProvidersController],
  providers: [DeliveryService, ShippingProvidersService],
  exports: [DeliveryService, ShippingProvidersService],
})
export class DeliveryModule { }
