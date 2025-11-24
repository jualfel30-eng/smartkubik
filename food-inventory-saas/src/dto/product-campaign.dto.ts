import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsDate,
  IsBoolean,
  ValidateNested,
  IsObject,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * Product Targeting DTO
 * PHASE 3: Extended with CustomerProductAffinity integration
 */
export class ProductTargetingDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  productCode?: string;

  // Purchase Count Filters
  @IsOptional()
  @IsNumber()
  @Min(1)
  minPurchaseCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxPurchaseCount?: number;

  // Total Spent Filters
  @IsOptional()
  @IsNumber()
  @Min(0)
  minTotalSpent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTotalSpent?: number;

  // Purchase Window
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  purchaseWindowStart?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  purchaseWindowEnd?: Date;

  // Recency Filters
  @IsOptional()
  @IsNumber()
  @Min(0)
  minDaysSinceLastPurchase?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDaysSinceLastPurchase?: number;

  // === PHASE 3: CustomerProductAffinity Integration ===

  // Affinity Score Filters (from CustomerProductAffinity cache)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minAffinityScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxAffinityScore?: number;

  // Customer Segment Filters (from CustomerProductAffinity)
  @IsOptional()
  @IsArray()
  @IsEnum(["new", "occasional", "regular", "frequent", "champion"], {
    each: true,
  })
  customerSegments?: string[];

  // Engagement Level Filters (from CustomerProductAffinity)
  @IsOptional()
  @IsArray()
  @IsEnum(["very_high", "high", "medium", "low", "at_risk"], { each: true })
  engagementLevels?: string[];

  // Purchase Frequency Filters
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchaseFrequencyDays?: number; // Buys at least every N days

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPurchaseFrequencyDays?: number; // Buys at most every N days

  // Quantity Filters
  @IsOptional()
  @IsNumber()
  @Min(0)
  minTotalQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTotalQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAverageQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAverageQuantity?: number;

  // Average Order Value Filters
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAverageOrderValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAverageOrderValue?: number;

  // Predictive Filters
  @IsOptional()
  @IsBoolean()
  includeRepurchasePredictions?: boolean; // Include customers predicted to repurchase soon

  @IsOptional()
  @IsNumber()
  @Min(1)
  repurchaseWindowDays?: number; // Predicted to repurchase within N days

  // Acquisition vs Retention
  @IsOptional()
  @IsBoolean()
  hasPurchasedProduct?: boolean; // true = retention, false = acquisition

  @IsOptional()
  @IsBoolean()
  neverPurchasedProduct?: boolean; // Target customers who never bought this product

  @IsOptional()
  @IsBoolean()
  includeInactiveCustomers?: boolean;
}

export class CampaignOfferDto {
  @IsEnum(["percentage", "fixed_amount", "free_shipping", "bogo"])
  type: string;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsArray()
  applicableProducts?: string[];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class EmailConfigDto {
  @IsOptional()
  @IsString()
  fromEmail?: string;

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsString()
  replyTo?: string;

  @IsOptional()
  @IsBoolean()
  trackOpens?: boolean;

  @IsOptional()
  @IsBoolean()
  trackClicks?: boolean;
}

export class CreateProductCampaignDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  // === PHASE 3: Campaign Category & Type ===

  @IsOptional()
  @IsEnum([
    "retention",
    "acquisition",
    "upsell",
    "cross-sell",
    "reactivation",
    "loyalty",
  ])
  campaignCategory?: string;

  @IsOptional()
  @IsEnum(["single_product", "product_bundle", "category", "complementary"])
  productCampaignType?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTargetingDto)
  productTargeting: ProductTargetingDto[];

  @IsOptional()
  @IsEnum(["ANY", "ALL"])
  targetingLogic?: string;

  @IsEnum(["email", "sms", "whatsapp"])
  channel: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EmailConfigDto)
  emailConfig?: EmailConfigDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CampaignOfferDto)
  offer?: CampaignOfferDto;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProductCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTargetingDto)
  productTargeting?: ProductTargetingDto[];

  @IsOptional()
  @IsEnum(["ANY", "ALL"])
  targetingLogic?: string;

  @IsOptional()
  @IsEnum(["email", "sms", "whatsapp"])
  channel?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EmailConfigDto)
  emailConfig?: EmailConfigDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CampaignOfferDto)
  offer?: CampaignOfferDto;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(["draft", "scheduled", "running", "completed", "cancelled"])
  status?: string;
}

export class CampaignFiltersDto {
  @IsOptional()
  @IsEnum(["draft", "scheduled", "running", "completed", "cancelled"])
  status?: string;

  @IsOptional()
  @IsString()
  productId?: string;
}

export class TrackPerformanceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  sent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delivered?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  opened?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  clicked?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  orders?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revenue?: number;
}

// ========================================================================
// PHASE 4: A/B TESTING & CAMPAIGN OPTIMIZATION DTOs
// ========================================================================

/**
 * Campaign Variant DTO for A/B Testing
 */
export class CampaignVariantDto {
  @IsString()
  variantName: string; // "A", "B", "Control", etc.

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  subject?: string; // Different subject for email

  @IsString()
  message: string; // Different message

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CampaignOfferDto)
  offer?: CampaignOfferDto;

  @IsNumber()
  @Min(0)
  @Max(100)
  trafficPercentage: number; // Traffic allocation (0-100%)

  @IsOptional()
  @IsEnum(["active", "paused", "winner", "loser"])
  status?: string;
}

/**
 * Create A/B Test Campaign DTO
 */
export class CreateAbTestCampaignDto extends CreateProductCampaignDto {
  @IsBoolean()
  isAbTest: boolean; // Must be true for A/B tests

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignVariantDto)
  variants: CampaignVariantDto[]; // At least 2 variants (A and B)

  @IsEnum(["open_rate", "click_rate", "conversion_rate", "revenue"])
  testMetric: string; // Metric to optimize for

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  testTrafficPercentage?: number; // % of audience to include in test

  @IsOptional()
  @IsNumber()
  @Min(10)
  minimumSampleSize?: number; // Minimum sends before declaring winner

  @IsOptional()
  @IsBoolean()
  autoSelectWinner?: boolean; // Auto-select winner when criteria met
}

/**
 * Add Variant to Existing Campaign DTO
 */
export class AddVariantDto {
  @IsString()
  variantName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CampaignOfferDto)
  offer?: CampaignOfferDto;

  @IsNumber()
  @Min(0)
  @Max(100)
  trafficPercentage: number;
}

/**
 * Update Variant DTO
 */
export class UpdateVariantDto {
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
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CampaignOfferDto)
  offer?: CampaignOfferDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  trafficPercentage?: number;

  @IsOptional()
  @IsEnum(["active", "paused", "winner", "loser"])
  status?: string;
}

/**
 * Track Variant Performance DTO
 */
export class TrackVariantPerformanceDto {
  @IsString()
  variantName: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delivered?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  opened?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  clicked?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  orders?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revenue?: number;
}
