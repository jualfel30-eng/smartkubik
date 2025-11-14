import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { PayrollConceptType } from "../../../schemas/payroll-concept.schema";

export class CreatePayrollRuleDto {
  @IsMongoId()
  conceptId: string;

  @IsEnum(["earning", "deduction", "employer"])
  conceptType: PayrollConceptType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @IsEnum(["fixed", "percentage", "formula"])
  calculationType: "fixed" | "percentage" | "formula";

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  formula?: string;

  @IsOptional()
  @IsString({ each: true })
  baseConceptCodes?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
