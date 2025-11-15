import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  PayrollCalendar,
  PayrollCalendarSchema,
} from "../../schemas/payroll-calendar.schema";
import { PayrollRun, PayrollRunSchema } from "../../schemas/payroll-run.schema";
import { Shift, ShiftSchema } from "../../schemas/shift.schema";
import {
  EmployeeContract,
  EmployeeContractSchema,
} from "../../schemas/employee-contract.schema";
import { PayrollCalendarService } from "./payroll-calendar/payroll-calendar.service";
import { PayrollCalendarController } from "./payroll-calendar/payroll-calendar.controller";
import { PayrollCalendarReminderService } from "./payroll-calendar/payroll-calendar-reminder.service";
import { EventsModule } from "../events/events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import {
  EmployeeAbsenceRequest,
  EmployeeAbsenceRequestSchema,
} from "../../schemas/employee-absence-request.schema";
import {
  EmployeeLeaveBalance,
  EmployeeLeaveBalanceSchema,
} from "../../schemas/employee-leave-balance.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PayrollCalendar.name, schema: PayrollCalendarSchema },
      { name: PayrollRun.name, schema: PayrollRunSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: EmployeeContract.name, schema: EmployeeContractSchema },
      { name: EmployeeAbsenceRequest.name, schema: EmployeeAbsenceRequestSchema },
      { name: EmployeeLeaveBalance.name, schema: EmployeeLeaveBalanceSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    EventsModule,
    NotificationsModule,
  ],
  providers: [PayrollCalendarService, PayrollCalendarReminderService],
  controllers: [PayrollCalendarController],
})
export class PayrollCalendarModule {}
