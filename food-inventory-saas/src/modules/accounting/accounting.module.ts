import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AccountingController } from "./accounting.controller";
import { AccountingService } from "./accounting.service";
import { BillingAccountingListener } from "./listeners/billing-accounting.listener";
import {
  ChartOfAccounts,
  ChartOfAccountsSchema,
} from "../../schemas/chart-of-accounts.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import {
  JournalEntry,
  JournalEntrySchema,
} from "../../schemas/journal-entry.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { Payable, PayableSchema } from "../../schemas/payable.schema";
import {
  BillingDocument,
  BillingDocumentSchema,
} from "../../schemas/billing-document.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChartOfAccounts.name, schema: ChartOfAccountsSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: Order.name, schema: OrderSchema },
      { name: Payable.name, schema: PayableSchema },
      { name: BillingDocument.name, schema: BillingDocumentSchema },
    ]),
  ],
  controllers: [AccountingController],
  providers: [AccountingService, BillingAccountingListener],
  exports: [AccountingService],
})
export class AccountingModule {}
