import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  PayrollConcept,
  PayrollConceptSchema,
} from "../../schemas/payroll-concept.schema";
import { PayrollRunsService } from "./payroll-runs.service";
import { PayrollRunsController } from "./payroll-runs.controller";
import { PayrollRun, PayrollRunSchema } from "../../schemas/payroll-run.schema";
import {
  PayrollStructure,
  PayrollStructureSchema,
} from "../../schemas/payroll-structure.schema";
import {
  PayrollRule,
  PayrollRuleSchema,
} from "../../schemas/payroll-rule.schema";
import {
  EmployeeProfile,
  EmployeeProfileSchema,
} from "../../schemas/employee-profile.schema";
import {
  EmployeeContract,
  EmployeeContractSchema,
} from "../../schemas/employee-contract.schema";
import {
  PayrollAuditLog,
  PayrollAuditLogSchema,
} from "../../schemas/payroll-audit-log.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import {
  SpecialPayrollRun,
  SpecialPayrollRunSchema,
} from "../../schemas/special-payroll-run.schema";
import { AccountingModule } from "../accounting/accounting.module";
import { PayrollEngineService } from "../payroll-structures/payroll.engine.service";
import {
  PayrollCalendar,
  PayrollCalendarSchema,
} from "../../schemas/payroll-calendar.schema";
import {
  ChartOfAccounts,
  ChartOfAccountsSchema,
} from "../../schemas/chart-of-accounts.schema";
import { PayablesService } from "../payables/payables.service";
import { Payable, PayableSchema } from "../../schemas/payable.schema";
import { EventsModule } from "../events/events.module";
import { ExchangeRateModule } from "../exchange-rate/exchange-rate.module";
import { PaymentsModule } from "../payments/payments.module";
import { NotificationsModule } from "../notifications/notifications.module";
import {
  BankAccount,
  BankAccountSchema,
} from "../../schemas/bank-account.schema";
import { MailModule } from "../mail/mail.module";
import { PayrollWebhooksModule } from "../payroll-webhooks/payroll-webhooks.module";
import { TipsModule } from "../tips/tips.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PayrollConcept.name, schema: PayrollConceptSchema },
      { name: PayrollRun.name, schema: PayrollRunSchema },
      { name: PayrollStructure.name, schema: PayrollStructureSchema },
      { name: PayrollRule.name, schema: PayrollRuleSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeContract.name, schema: EmployeeContractSchema },
      { name: PayrollAuditLog.name, schema: PayrollAuditLogSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: PayrollCalendar.name, schema: PayrollCalendarSchema },
      { name: ChartOfAccounts.name, schema: ChartOfAccountsSchema },
      { name: Payable.name, schema: PayableSchema },
      { name: BankAccount.name, schema: BankAccountSchema },
      { name: SpecialPayrollRun.name, schema: SpecialPayrollRunSchema },
    ]),
    AccountingModule,
    EventsModule,
    ExchangeRateModule,
    PaymentsModule,
    NotificationsModule,
    MailModule,
    PayrollWebhooksModule,
    TipsModule,
  ],
  controllers: [PayrollRunsController],
  providers: [PayrollRunsService, PayrollEngineService, PayablesService],
  exports: [PayrollRunsService],
})
export class PayrollRunsModule {}
