import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class PayrollConceptCalculationDto {
  @IsEnum(["fixed_amount", "percentage_of_base", "custom_formula"])
  method: "fixed_amount" | "percentage_of_base" | "custom_formula";

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  formula?: string;
}

export class CreatePayrollConceptDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(["earning", "deduction", "employer"])
  conceptType: "earning" | "deduction" | "employer";

  @ValidateNested()
  @Type(() => PayrollConceptCalculationDto)
  calculation: PayrollConceptCalculationDto;

  @IsOptional()
  @IsMongoId()
  debitAccountId?: string;

  @IsOptional()
  @IsMongoId()
  creditAccountId?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
