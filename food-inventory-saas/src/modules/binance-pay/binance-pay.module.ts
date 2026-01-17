import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import {
  BinancePayTransaction,
  BinancePayTransactionSchema,
} from "../../schemas/binance-pay-transaction.schema";
import { BinancePayController } from "./binance-pay.controller";
import { BinancePayWebhookController } from "./binance-pay-webhook.controller";
import { BinancePayService } from "./binance-pay.service";
import { BinancePayApiProvider } from "./binance-pay-api.provider";

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: BinancePayTransaction.name, schema: BinancePayTransactionSchema },
    ]),
  ],
  controllers: [BinancePayController, BinancePayWebhookController],
  providers: [BinancePayService, BinancePayApiProvider],
  exports: [BinancePayService],
})
export class BinancePayModule {}
