import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class RateEntryDto {
  @IsNumber()
  from: number;

  @IsNumber()
  to: number;

  @IsNumber()
  rate: number;
}

export class CreateLocalizationDto {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsOptional()
  @IsNumber()
  version?: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsEnum(["draft", "active"])
  status?: "draft" | "active";

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  rates?: Record<string, any>;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RateEntryDto)
  islrTable?: RateEntryDto[];
}
