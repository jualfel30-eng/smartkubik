import {
  IsDateString,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateLiquidationRunDto {
  @IsString()
  country: string;

  @IsOptional()
  @IsMongoId()
  ruleSetId?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalAmount?: number;
}
