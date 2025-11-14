import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class PayrollConceptFiltersDto {
  @IsOptional()
  @IsEnum(["earning", "deduction", "employer"])
  conceptType?: "earning" | "deduction" | "employer";

  @IsOptional()
  @IsMongoId()
  debitAccountId?: string;

  @IsOptional()
  @IsMongoId()
  creditAccountId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  onlyActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
