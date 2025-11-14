import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { PayrollStructurePeriodType } from "../../../schemas/payroll-structure.schema";

export class CreatePayrollStructureDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(["monthly", "biweekly", "weekly", "custom"])
  periodType?: PayrollStructurePeriodType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliesToRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliesToDepartments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliesToContractTypes?: string[];

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
