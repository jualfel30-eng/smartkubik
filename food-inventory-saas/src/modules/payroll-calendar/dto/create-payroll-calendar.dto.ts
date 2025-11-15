import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import {
  PayrollCalendarFrequency,
  PayrollCalendarStatus,
} from "../../../schemas/payroll-calendar.schema";

export class CreatePayrollCalendarDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @IsEnum(["monthly", "biweekly", "weekly", "custom"])
  frequency: PayrollCalendarFrequency;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsDateString()
  cutoffDate: string;

  @IsDateString()
  payDate: string;

  @IsOptional()
  @IsMongoId()
  structureId?: string;

  @IsOptional()
  @IsEnum(["draft", "open", "closed", "posted"])
  status?: PayrollCalendarStatus;
}

export class UpdatePayrollCalendarDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @IsOptional()
  @IsEnum(["monthly", "biweekly", "weekly", "custom"])
  frequency?: PayrollCalendarFrequency;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsDateString()
  cutoffDate?: string;

  @IsOptional()
  @IsDateString()
  payDate?: string;

  @IsOptional()
  @IsMongoId()
  structureId?: string;

  @IsOptional()
  @IsEnum(["draft", "open", "closed", "posted"])
  status?: PayrollCalendarStatus;
}
