import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class PayrollRunOverrideDto {
  @IsMongoId()
  employeeId: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  data?: Record<string, any>;
}

export class CreatePayrollRunDto {
  @IsEnum(["monthly", "biweekly", "custom"])
  periodType: "monthly" | "biweekly" | "custom";

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  employeeIds?: string[];

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PayrollRunOverrideDto)
  overrides?: PayrollRunOverrideDto[];
}
