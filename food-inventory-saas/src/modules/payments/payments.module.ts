import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { Payment, PaymentSchema } from "../../schemas/payment.schema";
import { Payable, PayableSchema } from "../../schemas/payable.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { Order, OrderSchema } from "../../schemas/order.schema"; // <-- Add import
import { AccountingModule } from "../accounting/accounting.module";
import { BankAccountsModule } from "../bank-accounts/bank-accounts.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Payable.name, schema: PayableSchema },
      { name: Tenant.name, schema: TenantSchema }, // For TenantGuard
      { name: Order.name, schema: OrderSchema }, // <-- Add Order model
    ]),
    AccountingModule,
    BankAccountsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
