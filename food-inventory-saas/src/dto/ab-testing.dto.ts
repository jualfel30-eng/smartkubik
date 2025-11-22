import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  Max,
  IsEnum,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class CreateVariantDto {
  @ApiProperty({ example: "Variant A - Discount Focus" })
  @IsString()
  name: string;

  @ApiProperty({
    example: "Emphasizes 20% discount in subject",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: "🔥 20% OFF - Limited Time!", required: false })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    example: "Get your 20% discount now! Limited time offer.",
    required: false,
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ example: ["https://example.com/image.jpg"], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media?: string[];

  @ApiProperty({
    example: 50,
    description: "Traffic allocation percentage (0-100)",
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  trafficAllocation: number;
}

export class CreateABTestDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439011" })
  @IsString()
  campaignId: string;

  @ApiProperty({ type: [CreateVariantDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];

  @ApiProperty({
    example: 1000,
    description: "Minimum sample size before declaring winner",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  minSampleSize?: number;

  @ApiProperty({
    example: 95,
    description: "Required confidence level (0-100)",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  requiredConfidence?: number;

  @ApiProperty({
    example: "conversion_rate",
    description: "Metric to optimize",
    required: false,
  })
  @IsOptional()
  @IsEnum(["open_rate", "click_rate", "conversion_rate", "revenue"])
  optimizationMetric?: string;

  @ApiProperty({
    example: true,
    description: "Auto-promote winner when significant",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  autoPromoteWinner?: boolean;
}

export class UpdateVariantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  trafficAllocation?: number;
}

export class ABTestResultsDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439011" })
  @IsString()
  campaignId: string;

  @ApiProperty({ example: "conversion_rate", required: false })
  @IsOptional()
  @IsEnum(["open_rate", "click_rate", "conversion_rate", "revenue"])
  metric?: string;
}

export class DeclareWinnerDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439011" })
  @IsString()
  variantId: string;

  @ApiProperty({
    example: "Manual selection - highest conversion rate",
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
