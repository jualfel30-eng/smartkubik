import { IsArray, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class AudienceFilterDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tiers?: string[]; // 'diamante', 'oro', 'plata', 'bronce'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerTypes?: string[]; // 'business', 'individual', 'walk-in'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  minSpent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSpent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDaysSinceLastVisit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minVisitCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxVisitCount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeCustomerIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeCustomerIds?: string[];

  // Product Affinity Filters (Phase 2)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[]; // Customers who purchased these products

  @IsOptional()
  @IsNumber()
  @Min(1)
  minPurchaseCount?: number; // Minimum times they purchased the product

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDaysSinceLastProductPurchase?: number; // Days since last purchase of product (win-back)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeProductIds?: string[]; // Customers who NEVER purchased these products (cross-sell)
}
