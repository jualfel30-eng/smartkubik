import { IsEnum } from "class-validator";

export class ExportPayrollRunDto {
  @IsEnum(["csv", "pdf"])
  format: "csv" | "pdf";
}
