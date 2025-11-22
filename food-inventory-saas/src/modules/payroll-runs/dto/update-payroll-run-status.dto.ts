import { IsEnum } from "class-validator";
import { PayrollRunStatus } from "../../../schemas/payroll-run.schema";

export class UpdatePayrollRunStatusDto {
  @IsEnum(["draft", "calculating", "calculated", "approved", "posted", "paid"])
  status: PayrollRunStatus;
}
