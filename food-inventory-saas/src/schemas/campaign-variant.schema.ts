import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CampaignVariantDocument = CampaignVariant & Document;

/**
 * CampaignVariant Schema - Phase 5: A/B Testing
 *
 * Stores different versions of a campaign for split testing
 */

export enum VariantStatus {
  TESTING = "testing",
  WINNER = "winner",
  LOSER = "loser",
  PAUSED = "paused",
}

@Schema({ timestamps: true })
export class CampaignVariant {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "MarketingCampaign",
    required: true,
    index: true,
  })
  campaignId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // e.g., "Variant A", "Variant B"

  @Prop()
  description: string;

  // Content variations
  @Prop()
  subject: string; // For email campaigns

  @Prop()
  message: string;

  @Prop({ type: [String], default: [] })
  media: string[]; // Image URLs

  // Split configuration
  @Prop({ type: Number, default: 50, min: 0, max: 100 })
  trafficAllocation: number; // Percentage of traffic (e.g., 50 for 50/50 split)

  @Prop({ type: String, enum: VariantStatus, default: VariantStatus.TESTING })
  status: VariantStatus;

  // Performance metrics
  @Prop({ type: Number, default: 0 })
  totalSent: number;

  @Prop({ type: Number, default: 0 })
  totalOpened: number;

  @Prop({ type: Number, default: 0 })
  totalClicked: number;

  @Prop({ type: Number, default: 0 })
  totalConverted: number;

  @Prop({ type: Number, default: 0 })
  revenue: number;

  // Statistical significance
  @Prop({ type: Number })
  openRate: number; // Calculated

  @Prop({ type: Number })
  clickRate: number; // Calculated

  @Prop({ type: Number })
  conversionRate: number; // Calculated

  @Prop({ type: Number })
  confidenceLevel: number; // 0-100 (e.g., 95 for 95% confidence)

  @Prop({ type: Boolean, default: false })
  isStatisticallySignificant: boolean;

  // Winner selection
  @Prop({ type: Date })
  declaredWinnerAt: Date;

  @Prop()
  winnerReason: string; // Why this variant won

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const CampaignVariantSchema =
  SchemaFactory.createForClass(CampaignVariant);

// Indexes
CampaignVariantSchema.index({ tenantId: 1, campaignId: 1 });
CampaignVariantSchema.index({ campaignId: 1, status: 1 });
