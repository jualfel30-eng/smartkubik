import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PayrollAbsencesController } from "./payroll-absences.controller";
import { PayrollAbsencesService } from "./payroll-absences.service";
import {
  EmployeeAbsenceRequest,
  EmployeeAbsenceRequestSchema,
} from "../../schemas/employee-absence-request.schema";
import {
  EmployeeLeaveBalance,
  EmployeeLeaveBalanceSchema,
} from "../../schemas/employee-leave-balance.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: EmployeeAbsenceRequest.name,
        schema: EmployeeAbsenceRequestSchema,
      },
      { name: EmployeeLeaveBalance.name, schema: EmployeeLeaveBalanceSchema },
    ]),
  ],
  controllers: [PayrollAbsencesController],
  providers: [PayrollAbsencesService],
  exports: [PayrollAbsencesService],
})
export class PayrollAbsencesModule {}
