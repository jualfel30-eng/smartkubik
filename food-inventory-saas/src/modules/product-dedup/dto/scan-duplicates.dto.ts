import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export const SCAN_STRATEGIES = [
  "barcode_exact",
  "sku_exact",
  "name_brand_size",
  "name_fuzzy",
] as const;

export type ScanStrategy = (typeof SCAN_STRATEGIES)[number];

export class ScanDuplicatesDto {
  @IsOptional()
  @IsArray()
  @IsEnum(SCAN_STRATEGIES, { each: true })
  strategies?: ScanStrategy[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minConfidence?: number;
}
