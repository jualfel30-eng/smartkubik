import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class ServicePackageItemDto {
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  offsetMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalResourceIds?: string[];

  @IsOptional()
  @IsBoolean()
  optional?: boolean;
}

export class DynamicPricingRuleDto {
  @IsString()
  adjustmentType: "percentage" | "fixed";

  @IsNumber()
  value: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsString()
  seasonStart?: string;

  @IsOptional()
  @IsString()
  seasonEnd?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  occupancyThreshold?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  loyaltyTiers?: string[];
}

export class CreateServicePackageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicePackageItemDto)
  items: ServicePackageItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  baseDiscountPercentage?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DynamicPricingRuleDto)
  dynamicPricingRules?: DynamicPricingRuleDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  leadTimeMinutes?: number;
}
