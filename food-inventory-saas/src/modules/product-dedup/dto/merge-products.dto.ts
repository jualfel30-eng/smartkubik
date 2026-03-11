import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class FieldResolutionDto {
  @IsString()
  @IsNotEmpty()
  field: string;

  @IsMongoId()
  @IsNotEmpty()
  sourceProductId: string;
}

export class MergeProductsDto {
  @IsMongoId()
  @IsNotEmpty()
  masterProductId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldResolutionDto)
  fieldResolutions?: FieldResolutionDto[];

  @IsOptional()
  @IsEnum(["combine", "keep_master"])
  variantMergeStrategy?: "combine" | "keep_master";

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkMergeDto {
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(100)
  minConfidence?: number;

  @IsOptional()
  @IsString()
  scanId?: string;
}

export class ReverseMergeDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
