import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class SpecialPayrollEmployeeDto {
  @IsMongoId()
  employeeId: string;

  @IsOptional()
  @IsMongoId()
  contractId?: string;

  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;
}

export class CreateSpecialPayrollRunDto {
  @IsEnum(["bonus", "severance", "thirteenth", "vacation_bonus"])
  type: "bonus" | "severance" | "thirteenth" | "vacation_bonus";

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SpecialPayrollEmployeeDto)
  employees?: SpecialPayrollEmployeeDto[];

  @IsOptional()
  @IsMongoId()
  structureId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  structureVersion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}
