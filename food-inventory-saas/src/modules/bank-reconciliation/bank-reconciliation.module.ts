import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BankReconciliationController } from "./bank-reconciliation.controller";
import { BankReconciliationService } from "./bank-reconciliation.service";
import {
  BankStatement,
  BankStatementSchema,
} from "../../schemas/bank-statement.schema";
import {
  BankReconciliation,
  BankReconciliationSchema,
} from "../../schemas/bank-reconciliation.schema";
import {
  JournalEntry,
  JournalEntrySchema,
} from "../../schemas/journal-entry.schema";
import { BankAccountsModule } from "../bank-accounts/bank-accounts.module";
import {
  BankTransaction,
  BankTransactionSchema,
} from "../../schemas/bank-transaction.schema";
import {
  BankStatementImport,
  BankStatementImportSchema,
} from "../../schemas/bank-statement-import.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankStatement.name, schema: BankStatementSchema },
      { name: BankReconciliation.name, schema: BankReconciliationSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: BankTransaction.name, schema: BankTransactionSchema },
      { name: BankStatementImport.name, schema: BankStatementImportSchema },
    ]),
    BankAccountsModule,
  ],
  controllers: [BankReconciliationController],
  providers: [BankReconciliationService],
  exports: [BankReconciliationService],
})
export class BankReconciliationModule {}
