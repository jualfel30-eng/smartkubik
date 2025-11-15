import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { PayrollCalendarFrequency } from "../../../schemas/payroll-calendar.schema";

export class GeneratePayrollCalendarDto {
  @IsEnum(["monthly", "biweekly", "weekly", "custom"])
  frequency: PayrollCalendarFrequency;

  @IsOptional()
  @IsDateString()
  anchorDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  count?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  payDateOffsetDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  cutoffOffsetDays?: number;

  @IsOptional()
  @IsString()
  namePrefix?: string;

  @IsOptional()
  @IsString()
  descriptionTemplate?: string;

  @IsOptional()
  @IsMongoId()
  structureId?: string;
}
