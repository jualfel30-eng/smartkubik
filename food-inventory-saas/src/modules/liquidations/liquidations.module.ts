import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  LiquidationRuleSet,
  LiquidationRuleSetSchema,
} from "../../schemas/liquidation-rule-set.schema";
import {
  LiquidationRun,
  LiquidationRunSchema,
} from "../../schemas/liquidation-run.schema";
import {
  EmployeeProfile,
  EmployeeProfileSchema,
} from "../../schemas/employee-profile.schema";
import {
  EmployeeContract,
  EmployeeContractSchema,
} from "../../schemas/employee-contract.schema";
import { LiquidationsService } from "./liquidations.service";
import { LiquidationsController } from "./liquidations.controller";
import { PayablesService } from "../payables/payables.service";
import { Payable, PayableSchema } from "../../schemas/payable.schema";
import { AccountingModule } from "../accounting/accounting.module";
import { PaymentsModule } from "../payments/payments.module";
import { ExchangeRateModule } from "../exchange-rate/exchange-rate.module";
import { EventsModule } from "../events/events.module";
import {
  ChartOfAccounts,
  ChartOfAccountsSchema,
} from "../../schemas/chart-of-accounts.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LiquidationRuleSet.name, schema: LiquidationRuleSetSchema },
      { name: LiquidationRun.name, schema: LiquidationRunSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeContract.name, schema: EmployeeContractSchema },
      { name: Payable.name, schema: PayableSchema },
      { name: ChartOfAccounts.name, schema: ChartOfAccountsSchema },
    ]),
    AccountingModule,
    PaymentsModule,
    ExchangeRateModule,
    EventsModule,
  ],
  controllers: [LiquidationsController],
  providers: [LiquidationsService, PayablesService],
})
export class LiquidationsModule {}
