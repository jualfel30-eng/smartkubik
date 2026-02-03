import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
} from "class-validator";

const ASSET_TYPES = [
  "equipment",
  "vehicle",
  "furniture",
  "building",
  "technology",
  "other",
] as const;

const DEPRECIATION_METHODS = ["straight_line", "declining_balance"] as const;

const ASSET_STATUSES = ["active", "disposed", "fully_depreciated"] as const;

export class CreateFixedAssetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ASSET_TYPES)
  assetType: string;

  @IsNumber()
  @Min(0)
  acquisitionCost: number;

  @IsDateString()
  acquisitionDate: string;

  @IsNumber()
  @Min(1)
  usefulLifeMonths: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  residualValue?: number;

  @IsOptional()
  @IsEnum(DEPRECIATION_METHODS)
  depreciationMethod?: string;
}

export class UpdateFixedAssetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ASSET_TYPES)
  assetType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  acquisitionCost?: number;

  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usefulLifeMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  residualValue?: number;

  @IsOptional()
  @IsEnum(DEPRECIATION_METHODS)
  depreciationMethod?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accumulatedDepreciation?: number;

  @IsOptional()
  @IsEnum(ASSET_STATUSES)
  status?: string;
}
