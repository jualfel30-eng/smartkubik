import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * PHASE 5: ADVANCED ANALYTICS & REPORTING
 * CampaignAnalytics - Stores aggregated analytics for campaigns
 * Enables time-series analysis, trend tracking, and performance comparison
 */

@Schema({ timestamps: true })
export class DailyPerformance {
  @Prop({ required: true, type: Date })
  date: Date;

  @Prop({ default: 0 })
  sent: number;

  @Prop({ default: 0 })
  delivered: number;

  @Prop({ default: 0 })
  opened: number;

  @Prop({ default: 0 })
  clicked: number;

  @Prop({ default: 0 })
  orders: number;

  @Prop({ default: 0 })
  revenue: number;

  @Prop({ default: 0 })
  openRate: number;

  @Prop({ default: 0 })
  clickRate: number;

  @Prop({ default: 0 })
  conversionRate: number;
}

export const DailyPerformanceSchema =
  SchemaFactory.createForClass(DailyPerformance);

@Schema({ timestamps: true })
export class SegmentPerformance {
  @Prop({ required: true })
  segmentName: string; // "new", "occasional", "regular", "frequent", "champion"

  @Prop({ default: 0 })
  customerCount: number;

  @Prop({ default: 0 })
  sent: number;

  @Prop({ default: 0 })
  opened: number;

  @Prop({ default: 0 })
  clicked: number;

  @Prop({ default: 0 })
  orders: number;

  @Prop({ default: 0 })
  revenue: number;

  @Prop({ default: 0 })
  openRate: number;

  @Prop({ default: 0 })
  clickRate: number;

  @Prop({ default: 0 })
  conversionRate: number;

  @Prop({ default: 0 })
  revenuePerCustomer: number;
}

export const SegmentPerformanceSchema =
  SchemaFactory.createForClass(SegmentPerformance);

@Schema({ timestamps: true })
export class ProductPerformance {
  @Prop({ required: true, type: Types.ObjectId, ref: "Product" })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ default: 0 })
  orderCount: number;

  @Prop({ default: 0 })
  quantitySold: number;

  @Prop({ default: 0 })
  revenue: number;

  @Prop({ default: 0 })
  conversionRate: number;

  @Prop({ default: 0 })
  revenuePerOrder: number;
}

export const ProductPerformanceSchema =
  SchemaFactory.createForClass(ProductPerformance);

@Schema({ timestamps: true })
export class CampaignAnalytics extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: "ProductCampaign" })
  campaignId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: "Tenant" })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  campaignName: string;

  // === OVERALL PERFORMANCE ===

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

  @Prop({ default: 0 })
  totalCost: number;

  // === CALCULATED METRICS ===

  @Prop({ default: 0 })
  openRate: number; // (opened / delivered) * 100

  @Prop({ default: 0 })
  clickRate: number; // (clicked / opened) * 100

  @Prop({ default: 0 })
  clickThroughRate: number; // (clicked / delivered) * 100

  @Prop({ default: 0 })
  conversionRate: number; // (orders / delivered) * 100

  @Prop({ default: 0 })
  revenuePerRecipient: number; // revenue / sent

  @Prop({ default: 0 })
  revenuePerOrder: number; // revenue / orders

  @Prop({ default: 0 })
  roi: number; // ((revenue - cost) / cost) * 100

  @Prop({ default: 0 })
  costPerAcquisition: number; // cost / orders

  @Prop({ default: 0 })
  costPerClick: number; // cost / clicked

  // === TIME-SERIES DATA ===

  @Prop({ type: [DailyPerformanceSchema], default: [] })
  dailyPerformance: DailyPerformance[];

  // === SEGMENT BREAKDOWN ===

  @Prop({ type: [SegmentPerformanceSchema], default: [] })
  segmentPerformance: SegmentPerformance[];

  // === PRODUCT PERFORMANCE ===

  @Prop({ type: [ProductPerformanceSchema], default: [] })
  productPerformance: ProductPerformance[];

  // === A/B TEST ANALYTICS (if applicable) ===

  @Prop({ type: Boolean, default: false })
  isAbTest: boolean;

  @Prop({ type: String })
  winningVariant?: string;

  @Prop({ type: Number })
  improvementPercentage?: number; // How much winner improved over control

  @Prop({ type: String })
  testMetric?: string; // Metric used for comparison

  // === ATTRIBUTION & ENGAGEMENT ===

  @Prop({ default: 0 })
  uniqueCustomersEngaged: number; // Unique customers who opened/clicked

  @Prop({ default: 0 })
  repeatPurchasers: number; // Customers who bought multiple times from campaign

  @Prop({ default: 0 })
  averageTimeToPurchase: number; // Avg hours from send to first purchase

  @Prop({ default: 0 })
  engagementScore: number; // Weighted score of opens, clicks, orders

  // === TIMING ANALYTICS ===

  @Prop({ type: Date })
  firstSentAt?: Date;

  @Prop({ type: Date })
  lastSentAt?: Date;

  @Prop({ type: Date })
  firstOrderAt?: Date;

  @Prop({ type: Date })
  lastOrderAt?: Date;

  @Prop({ default: 0 })
  campaignDurationHours: number;

  // === COHORT ANALYSIS ===

  @Prop({ type: Map, of: Number, default: {} })
  cohortRevenue: Map<string, number>; // Revenue by customer acquisition cohort

  @Prop({ type: Map, of: Number, default: {} })
  cohortConversion: Map<string, number>; // Conversion by cohort

  // === METADATA ===

  @Prop({ type: Date })
  lastCalculatedAt: Date;

  @Prop({ type: String })
  calculationStatus: string; // "pending", "calculating", "complete", "error"
}

export const CampaignAnalyticsSchema =
  SchemaFactory.createForClass(CampaignAnalytics);

// Indexes for efficient querying
CampaignAnalyticsSchema.index({ campaignId: 1, tenantId: 1 }, { unique: true });
CampaignAnalyticsSchema.index({ tenantId: 1, lastCalculatedAt: -1 });
CampaignAnalyticsSchema.index({ tenantId: 1, roi: -1 }); // For ROI leaderboards
CampaignAnalyticsSchema.index({ tenantId: 1, conversionRate: -1 }); // For performance rankings
