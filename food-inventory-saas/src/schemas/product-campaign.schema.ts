import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * Product Targeting Criteria - How to select customers based on product purchase history
 * PHASE 3: Extended with CustomerProductAffinity integration
 */
@Schema()
export class ProductTargeting {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop()
  productCode?: string;

  // Purchase history filters
  @Prop({ type: Number })
  minPurchaseCount?: number; // Min number of times purchased

  @Prop({ type: Number })
  maxPurchaseCount?: number; // Max number of times purchased

  @Prop({ type: Number })
  minTotalSpent?: number; // Min total spent on this product

  @Prop({ type: Number })
  maxTotalSpent?: number; // Max total spent on this product

  @Prop({ type: Date })
  purchaseWindowStart?: Date; // Only count purchases after this date

  @Prop({ type: Date })
  purchaseWindowEnd?: Date; // Only count purchases before this date

  // Recency filters
  @Prop({ type: Number })
  minDaysSinceLastPurchase?: number; // At least N days since last purchase

  @Prop({ type: Number })
  maxDaysSinceLastPurchase?: number; // At most N days since last purchase

  // === PHASE 3: CustomerProductAffinity Integration ===

  // Affinity Score Filters (from CustomerProductAffinity cache)
  @Prop({ type: Number, min: 0, max: 100 })
  minAffinityScore?: number; // Minimum affinity score (0-100)

  @Prop({ type: Number, min: 0, max: 100 })
  maxAffinityScore?: number; // Maximum affinity score

  // Customer Segment Filters (from CustomerProductAffinity)
  @Prop({
    type: [String],
    enum: ["new", "occasional", "regular", "frequent", "champion"],
  })
  customerSegments?: string[]; // Target specific customer segments

  // Engagement Level Filters (from CustomerProductAffinity)
  @Prop({
    type: [String],
    enum: ["very_high", "high", "medium", "low", "at_risk"],
  })
  engagementLevels?: string[]; // Target specific engagement levels

  // Purchase Frequency Filters
  @Prop({ type: Number })
  minPurchaseFrequencyDays?: number; // Buys at least every N days

  @Prop({ type: Number })
  maxPurchaseFrequencyDays?: number; // Buys at most every N days

  // Quantity Filters
  @Prop({ type: Number })
  minTotalQuantity?: number; // Total units purchased

  @Prop({ type: Number })
  maxTotalQuantity?: number;

  @Prop({ type: Number })
  minAverageQuantity?: number; // Average units per order

  @Prop({ type: Number })
  maxAverageQuantity?: number;

  // Average Order Value Filters
  @Prop({ type: Number })
  minAverageOrderValue?: number;

  @Prop({ type: Number })
  maxAverageOrderValue?: number;

  // Predictive Filters
  @Prop({ type: Boolean, default: false })
  includeRepurchasePredictions?: boolean; // Include customers predicted to repurchase soon

  @Prop({ type: Number })
  repurchaseWindowDays?: number; // Predicted to repurchase within N days (default: 7)

  // Acquisition vs Retention
  @Prop({ type: Boolean })
  hasPurchasedProduct?: boolean; // true = retention, false = acquisition

  @Prop({ type: Boolean })
  neverPurchasedProduct?: boolean; // Target customers who never bought this product

  @Prop({ type: Boolean, default: true })
  includeInactiveCustomers: boolean; // Include customers who haven't purchased recently
}

const ProductTargetingSchema = SchemaFactory.createForClass(ProductTargeting);

/**
 * Campaign Performance by Product
 */
@Schema()
export class ProductPerformance {
  @Prop({ type: Types.ObjectId, ref: "Product" })
  productId: Types.ObjectId;

  @Prop()
  productName: string;

  @Prop({ default: 0 })
  ordersGenerated: number; // Orders containing this product

  @Prop({ default: 0 })
  unitsS: number; // Units of this product sold

  @Prop({ default: 0 })
  revenue: number; // Revenue from this product

  @Prop({ type: [Types.ObjectId] })
  convertedCustomerIds: Types.ObjectId[]; // Customers who purchased after campaign
}

const ProductPerformanceSchema =
  SchemaFactory.createForClass(ProductPerformance);

/**
 * Campaign Variant - Individual version of a campaign for A/B testing
 * PHASE 4: A/B Testing & Campaign Optimization
 */
@Schema()
export class CampaignVariant {
  @Prop({ required: true })
  variantName: string; // "A", "B", "Control", etc.

  @Prop()
  description?: string;

  @Prop()
  subject?: string; // Different subject for email

  @Prop({ required: true })
  message: string; // Different message

  @Prop()
  htmlContent?: string;

  @Prop({ type: Object })
  offer?: {
    type: string; // 'percentage', 'fixed_amount', 'free_shipping', 'bogo'
    value: number;
    applicableProducts?: Types.ObjectId[];
    expiresAt?: Date;
    couponCode?: string;
  };

  // Traffic allocation (0-100%)
  @Prop({ required: true, min: 0, max: 100, default: 50 })
  trafficPercentage: number;

  // Variant Status
  @Prop({
    enum: ["active", "paused", "winner", "loser"],
    default: "active",
  })
  status: string;

  // Performance metrics for this variant
  @Prop({ default: 0 })
  totalSent: number;

  @Prop({ default: 0 })
  totalDelivered: number;

  @Prop({ default: 0 })
  totalOpened: number;

  @Prop({ default: 0 })
  totalClicked: number;

  @Prop({ default: 0 })
  totalOrders: number;

  @Prop({ default: 0 })
  totalRevenue: number;

  // Calculated rates (updated after each send)
  @Prop({ default: 0 })
  openRate: number; // %

  @Prop({ default: 0 })
  clickRate: number; // %

  @Prop({ default: 0 })
  conversionRate: number; // %

  @Prop({ default: 0 })
  revenuePerRecipient: number; // Total revenue / total sent

  // Target customers assigned to this variant
  @Prop({ type: [Types.ObjectId], ref: "Customer" })
  assignedCustomerIds: Types.ObjectId[];
}

const CampaignVariantSchema = SchemaFactory.createForClass(CampaignVariant);

/**
 * ProductCampaign - Marketing campaigns targeted by product purchase affinity
 *
 * This schema enables product-based customer segmentation using the ProductAffinity matrix.
 * Instead of manually selecting customers, campaigns auto-target customers who have
 * purchased specific products.
 *
 * Use Cases:
 * - "Send discount on Aceite de Coco to all customers who bought it in last 3 months"
 * - "Promote new Miel flavor to customers who purchase Miel con panal regularly"
 * - "Re-engage customers who bought Beef Tallow but haven't ordered in 60 days"
 *
 * PHASE 4: Now supports A/B Testing with multiple campaign variants
 */
@Schema({ timestamps: true })
export class ProductCampaign {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  // Campaign Basic Info
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  // Product Targeting - Core Feature
  @Prop({ type: [ProductTargetingSchema], required: true })
  productTargeting: ProductTargeting[];

  // Targeting Logic
  @Prop({
    type: String,
    enum: ["ANY", "ALL"], // ANY = purchased any of these products, ALL = purchased all products
    default: "ANY",
  })
  targetingLogic: string;

  // Auto-Generated Segment
  @Prop({ type: [Types.ObjectId], ref: "Customer" })
  targetCustomerIds: Types.ObjectId[]; // Auto-populated from ProductAffinityService

  @Prop({ default: 0 })
  estimatedReach: number; // Number of customers in target

  @Prop({ type: Date })
  segmentGeneratedAt?: Date; // When was the segment last calculated

  // Campaign Content
  @Prop({ required: true, enum: ["email", "sms", "whatsapp"] })
  channel: string;

  // Email Template Reference (PHASE 1: Integration with NotificationsService)
  @Prop({ type: Types.ObjectId, ref: "EmailTemplate" })
  emailTemplateId?: Types.ObjectId;

  @Prop()
  subject?: string; // For email

  @Prop({ required: true })
  message: string;

  @Prop()
  htmlContent?: string;

  @Prop({ type: Object })
  emailConfig?: {
    fromEmail?: string;
    fromName?: string;
    replyTo?: string;
    trackOpens?: boolean;
    trackClicks?: boolean;
  };

  // Discount/Offer Details
  @Prop({ type: Object })
  offer?: {
    type: string; // 'percentage', 'fixed_amount', 'free_shipping', 'bogo'
    value: number;
    applicableProducts?: Types.ObjectId[]; // If offer applies to specific products
    expiresAt?: Date;
    couponCode?: string;
  };

  // Campaign Status & Scheduling
  @Prop({
    enum: ["draft", "scheduled", "running", "completed", "cancelled"],
    default: "draft",
    index: true,
  })
  status: string;

  @Prop({ type: Date })
  scheduledDate?: Date;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  // Campaign Performance
  @Prop({ default: 0 })
  totalSent: number;

  @Prop({ default: 0 })
  totalDelivered: number;

  @Prop({ default: 0 })
  totalOpened: number;

  @Prop({ default: 0 })
  totalClicked: number;

  @Prop({ default: 0 })
  totalOrders: number; // Total orders generated

  @Prop({ default: 0 })
  totalRevenue: number; // Total revenue generated

  @Prop({ default: 0 })
  totalFailed: number;

  // Product-Specific Performance
  @Prop({ type: [ProductPerformanceSchema], default: [] })
  productPerformance: ProductPerformance[];

  // ROI Calculation
  @Prop({ default: 0 })
  cost: number; // Cost of running campaign

  @Prop({ default: 0 })
  roi: number; // (revenue - cost) / cost * 100

  // === PHASE 3: Advanced Audience Insights ===

  // Campaign Category for organization
  @Prop({
    type: String,
    enum: [
      "retention",
      "acquisition",
      "upsell",
      "cross-sell",
      "reactivation",
      "loyalty",
    ],
  })
  campaignCategory?: string;

  // Campaign Type
  @Prop({
    type: String,
    enum: ["single_product", "product_bundle", "category", "complementary"],
  })
  productCampaignType?: string;

  // Audience Insights (calculated when campaign is created)
  @Prop({ type: Object })
  audienceInsights?: {
    totalMatchingCustomers?: number;
    segmentDistribution?: Record<string, number>; // Count per segment (new, occasional, etc.)
    engagementDistribution?: Record<string, number>; // Count per engagement level
    averageAffinityScore?: number;
    averagePurchaseFrequency?: number; // Average days between purchases
    totalPotentialRevenue?: number; // Based on historical avg order value
    estimatedConversionRate?: number; // Based on historical data
    estimatedRevenue?: number;
    topCustomerIds?: string[]; // Top 10 customers by affinity score
  };

  // Product-Specific Metrics (PHASE 3 additions)
  @Prop({ default: 0 })
  newCustomersAcquired: number; // First-time buyers of this product

  @Prop({ default: 0 })
  reactivatedCustomers: number; // At-risk customers who repurchased

  @Prop({ default: 0 })
  predictedCustomersConverted: number; // Customers from predictive recommendations who converted

  // === PHASE 4: A/B Testing & Campaign Optimization ===

  // A/B Testing Configuration
  @Prop({ type: Boolean, default: false })
  isAbTest: boolean; // Whether this campaign uses A/B testing

  @Prop({ type: [CampaignVariantSchema], default: [] })
  variants: CampaignVariant[]; // Campaign variants for A/B testing

  @Prop({ type: String })
  winningVariantName?: string; // Name of the winning variant (after test completion)

  @Prop({
    type: String,
    enum: ["open_rate", "click_rate", "conversion_rate", "revenue"],
  })
  testMetric?: string; // Metric used to determine winner

  @Prop({ type: Number, min: 0, max: 100 })
  testTrafficPercentage?: number; // % of audience to include in test (rest gets winner)

  @Prop({ type: Date })
  testStartDate?: Date; // When A/B test started

  @Prop({ type: Date })
  testEndDate?: Date; // When A/B test ended

  @Prop({ type: Number })
  minimumSampleSize?: number; // Minimum sends before declaring winner

  @Prop({ type: Boolean, default: false })
  autoSelectWinner: boolean; // Automatically select winner after criteria met

  // Link to Created Marketing Campaign
  @Prop({ type: Types.ObjectId, ref: "MarketingCampaign" })
  marketingCampaignId?: Types.ObjectId; // Reference to auto-created MarketingCampaign

  // Metadata
  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop()
  notes?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export type ProductCampaignDocument = ProductCampaign & Document;
export const ProductCampaignSchema =
  SchemaFactory.createForClass(ProductCampaign);

// Indexes
ProductCampaignSchema.index({ tenantId: 1, status: 1 });
ProductCampaignSchema.index({ tenantId: 1, "productTargeting.productId": 1 });
ProductCampaignSchema.index({ tenantId: 1, scheduledDate: 1 });
ProductCampaignSchema.index({ tenantId: 1, createdAt: -1 });
