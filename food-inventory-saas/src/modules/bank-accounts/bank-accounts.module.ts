import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BankAccountsController } from "./bank-accounts.controller";
import { BankAccountsService } from "./bank-accounts.service";
import {
  BankAccount,
  BankAccountSchema,
} from "../../schemas/bank-account.schema";
import {
  BankReconciliation,
  BankReconciliationSchema,
} from "../../schemas/bank-reconciliation.schema";
import {
  BankStatement,
  BankStatementSchema,
} from "../../schemas/bank-statement.schema";
import { AuthModule } from "../../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { ModuleAccessGuard } from "../../guards/module-access.guard";
import {
  BankTransaction,
  BankTransactionSchema,
} from "../../schemas/bank-transaction.schema";
import { BankTransactionsService } from "./bank-transactions.service";
import { BankTransactionsController } from "./bank-transactions.controller";
import { BankTransfersController } from "./bank-transfers.controller";
import { BankTransfersService } from "./bank-transfers.service";
import { BankAlertsService } from "./bank-alerts.service";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankAccount.name, schema: BankAccountSchema },
      { name: BankReconciliation.name, schema: BankReconciliationSchema },
      { name: BankStatement.name, schema: BankStatementSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: BankTransaction.name, schema: BankTransactionSchema },
    ]),
    AuthModule,
    PermissionsModule,
    EventsModule,
  ],
  controllers: [
    BankAccountsController,
    BankTransactionsController,
    BankTransfersController,
  ],
  providers: [
    BankAccountsService,
    BankTransactionsService,
    BankTransfersService,
    BankAlertsService,
    ModuleAccessGuard,
  ],
  exports: [
    BankAccountsService,
    BankTransactionsService,
    BankTransfersService,
    BankAlertsService,
  ],
})
export class BankAccountsModule {}
