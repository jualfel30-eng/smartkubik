import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  PayrollRun,
  PayrollRunSchema,
} from "../../schemas/payroll-run.schema";
import {
  EmployeeAbsenceRequest,
  EmployeeAbsenceRequestSchema,
} from "../../schemas/employee-absence-request.schema";
import { PayrollReportsService } from "./payroll-reports.service";
import { PayrollReportsController } from "./payroll-reports.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PayrollRun.name, schema: PayrollRunSchema },
      { name: EmployeeAbsenceRequest.name, schema: EmployeeAbsenceRequestSchema },
    ]),
  ],
  controllers: [PayrollReportsController],
  providers: [PayrollReportsService],
  exports: [PayrollReportsService],
})
export class PayrollReportsModule {}
