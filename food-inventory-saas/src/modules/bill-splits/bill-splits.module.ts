import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BillSplitsController } from "./bill-splits.controller";
import { BillSplitsService } from "./bill-splits.service";
import { BillSplit, BillSplitSchema } from "../../schemas/bill-split.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { Payment, PaymentSchema } from "../../schemas/payment.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BillSplit.name, schema: BillSplitSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [BillSplitsController],
  providers: [BillSplitsService],
  exports: [BillSplitsService],
})
export class BillSplitsModule {}
