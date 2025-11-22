import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class AddPayrollAdjustmentDto {
  @IsEnum(["earning", "deduction", "employer"])
  conceptType: "earning" | "deduction" | "employer";

  @IsString()
  conceptCode: string;

  @IsOptional()
  @IsString()
  conceptName?: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMongoId()
  employeeId?: string;

  @IsOptional()
  @IsMongoId()
  contractId?: string;

  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsMongoId()
  accountId?: string;
}
