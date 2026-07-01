import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Order, OrderSchema } from "../../schemas/order.schema";
import {
  ChartOfAccounts,
  ChartOfAccountsSchema,
} from "../../schemas/chart-of-accounts.schema";
import {
  JournalEntry,
  JournalEntrySchema,
} from "../../schemas/journal-entry.schema";
import { Return, ReturnSchema } from "./schemas/return.schema";
import { ReturnsService } from "./returns.service";
import { ReturnsAccountingService } from "./returns-accounting.service";
import { ReturnsController } from "./returns.controller";
import { InventoryModule } from "../inventory/inventory.module";
import { CashRegisterModule } from "../cash-register/cash-register.module";
import { PaymentsModule } from "../payments/payments.module";
import { StoreCreditModule } from "../store-credit/store-credit.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Return.name, schema: ReturnSchema },
      { name: Order.name, schema: OrderSchema },
      { name: ChartOfAccounts.name, schema: ChartOfAccountsSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
    ]),
    InventoryModule,
    CashRegisterModule,
    PaymentsModule,
    StoreCreditModule,
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService, ReturnsAccountingService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
