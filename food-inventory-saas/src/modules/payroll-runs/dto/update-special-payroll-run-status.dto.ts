import { IsEnum } from "class-validator";

export class UpdateSpecialPayrollRunStatusDto {
  @IsEnum(["draft", "calculating", "calculated", "approved", "posted", "paid"])
  status:
    | "draft"
    | "calculating"
    | "calculated"
    | "approved"
    | "posted"
    | "paid";
}
