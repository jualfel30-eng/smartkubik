import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CashRegisterController } from "./cash-register.controller";
import { CashRegisterService } from "./cash-register.service";
import {
  CashRegisterSession,
  CashRegisterSessionSchema,
} from "../../schemas/cash-register-session.schema";
import {
  CashRegisterClosing,
  CashRegisterClosingSchema,
} from "../../schemas/cash-register-closing.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { Payment, PaymentSchema } from "../../schemas/payment.schema";
import { User, UserSchema } from "../../schemas/user.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CashRegisterSession.name, schema: CashRegisterSessionSchema },
      { name: CashRegisterClosing.name, schema: CashRegisterClosingSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
