import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { Order, OrderSchema } from "../../schemas/order.schema";
import {
  StripePaymentIntent,
  StripePaymentIntentSchema,
} from "../../schemas/stripe-payment-intent.schema";
import { StripeApiProvider } from "./stripe-api.provider";
import { StripePayPublicController } from "./stripe-pay-public.controller";
import { StripePayService } from "./stripe-pay.service";
import { StripeWebhookController } from "./stripe-webhook.controller";

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: StripePaymentIntent.name, schema: StripePaymentIntentSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [StripePayPublicController, StripeWebhookController],
  providers: [StripeApiProvider, StripePayService],
  exports: [StripePayService, StripeApiProvider],
})
export class StripePayModule {}
