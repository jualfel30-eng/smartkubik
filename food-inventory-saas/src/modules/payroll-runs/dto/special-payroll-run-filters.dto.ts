import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class SpecialPayrollRunFiltersDto {
  @IsOptional()
  @IsEnum(["bonus", "severance", "thirteenth", "vacation_bonus"])
  type?: "bonus" | "severance" | "thirteenth" | "vacation_bonus";

  @IsOptional()
  @IsEnum(["draft", "calculating", "calculated", "approved", "posted", "paid"])
  status?:
    | "draft"
    | "calculating"
    | "calculated"
    | "approved"
    | "posted"
    | "paid";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;
}
