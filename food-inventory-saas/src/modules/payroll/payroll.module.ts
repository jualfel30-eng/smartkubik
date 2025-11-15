import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import {
  ChartOfAccounts,
  ChartOfAccountsSchema,
} from "../../schemas/chart-of-accounts.schema";
import {
  PayrollStructure,
  PayrollStructureSchema,
} from "../../schemas/payroll-structure.schema";
import { PayrollBootstrapService } from "./payroll-bootstrap.service";
import { PayrollRunsModule } from "../payroll-runs/payroll-runs.module";
import { PayrollStructuresModule } from "../payroll-structures/payroll-structures.module";
import { PayrollCalendarModule } from "../payroll-calendar/payroll-calendar.module";
import { PayrollAbsencesModule } from "../payroll-absences/payroll-absences.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: ChartOfAccounts.name, schema: ChartOfAccountsSchema },
      { name: PayrollStructure.name, schema: PayrollStructureSchema },
    ]),
    PayrollRunsModule,
    PayrollStructuresModule,
    PayrollCalendarModule,
    PayrollAbsencesModule,
  ],
  providers: [PayrollBootstrapService],
})
export class PayrollModule {}
