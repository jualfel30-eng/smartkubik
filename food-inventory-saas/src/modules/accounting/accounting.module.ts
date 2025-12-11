import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AccountingController } from "./accounting.controller";
import { AccountingService } from "./accounting.service";
import { BillingAccountingListener } from "./listeners/billing-accounting.listener";
import { TaxSettingsService } from "./services/tax-settings.service";
import { IvaWithholdingService } from "./services/iva-withholding.service";
import { IvaPurchaseBookService } from "./services/iva-purchase-book.service";
import { IvaSalesBookService } from "./services/iva-sales-book.service";
import { IvaDeclarationService } from "./services/iva-declaration.service";
import { TaxSettingsController } from "./controllers/tax-settings.controller";
import { IvaWithholdingController } from "./controllers/iva-withholding.controller";
import { IvaBooksController } from "./controllers/iva-books.controller";
import { IvaDeclarationController } from "./controllers/iva-declaration.controller";
import { IslrWithholdingService } from "./services/islr-withholding.service";
import { IslrWithholdingController } from "./controllers/islr-withholding.controller";
import { AccountingPeriodService } from "./services/accounting-period.service";
import { AccountingPeriodController } from "./controllers/accounting-period.controller";
import { RecurringEntryService } from "./services/recurring-entry.service";
import { RecurringEntryController } from "./controllers/recurring-entry.controller";
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
import { TaxSettings, TaxSettingsSchema } from "../../schemas/tax-settings.schema";
import { IvaWithholding, IvaWithholdingSchema } from "../../schemas/iva-withholding.schema";
import { IvaPurchaseBook, IvaPurchaseBookSchema } from "../../schemas/iva-purchase-book.schema";
import { IvaSalesBook, IvaSalesBookSchema } from "../../schemas/iva-sales-book.schema";
import { IvaDeclaration, IvaDeclarationSchema } from "../../schemas/iva-declaration.schema";
import { IslrWithholding, IslrWithholdingSchema } from "../../schemas/islr-withholding.schema";
import { AccountingPeriod, AccountingPeriodSchema } from "../../schemas/accounting-period.schema";
import { RecurringEntry, RecurringEntrySchema } from "../../schemas/recurring-entry.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChartOfAccounts.name, schema: ChartOfAccountsSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: Order.name, schema: OrderSchema },
      { name: Payable.name, schema: PayableSchema },
      { name: BillingDocument.name, schema: BillingDocumentSchema },
      { name: TaxSettings.name, schema: TaxSettingsSchema },
      { name: IvaWithholding.name, schema: IvaWithholdingSchema },
      { name: IvaPurchaseBook.name, schema: IvaPurchaseBookSchema },
      { name: IvaSalesBook.name, schema: IvaSalesBookSchema },
      { name: IvaDeclaration.name, schema: IvaDeclarationSchema },
      { name: IslrWithholding.name, schema: IslrWithholdingSchema },
      { name: AccountingPeriod.name, schema: AccountingPeriodSchema },
      { name: RecurringEntry.name, schema: RecurringEntrySchema },
    ]),
  ],
  controllers: [
    AccountingController,
    TaxSettingsController,
    IvaWithholdingController,
    IvaBooksController,
    IvaDeclarationController,
    IslrWithholdingController,
    AccountingPeriodController,
    RecurringEntryController,
  ],
  providers: [
    AccountingService,
    TaxSettingsService,
    IvaWithholdingService,
    IvaPurchaseBookService,
    IvaSalesBookService,
    IvaDeclarationService,
    IslrWithholdingService,
    AccountingPeriodService,
    RecurringEntryService,
    BillingAccountingListener,
  ],
  exports: [
    AccountingService,
    TaxSettingsService,
    IvaWithholdingService,
    IvaPurchaseBookService,
    IvaSalesBookService,
    IvaDeclarationService,
    IslrWithholdingService,
    AccountingPeriodService,
    RecurringEntryService,
  ],
})
export class AccountingModule {}
