import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type MarketingTriggerDocument = MarketingTrigger & Document;

/**
 * MarketingTrigger Schema - Phase 3: Behavioral Triggers
 *
 * Automated marketing triggers based on customer behavior:
 * - Cart abandonment
 * - First purchase welcome
 * - Birthday/Anniversary
 * - Inactivity (X days without purchase)
 * - Product-specific events
 */

export enum TriggerEventType {
  CART_ABANDONED = "cart_abandoned",
  FIRST_PURCHASE = "first_purchase",
  CUSTOMER_BIRTHDAY = "customer_birthday",
  REGISTRATION_ANNIVERSARY = "registration_anniversary",
  INACTIVITY = "inactivity",
  PRODUCT_BACK_IN_STOCK = "product_back_in_stock",
  PRICE_DROP = "price_drop",
  TIER_UPGRADE = "tier_upgrade",
  PURCHASE_MILESTONE = "purchase_milestone",
}

export enum TriggerStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  INACTIVE = "inactive",
}

@Schema({ timestamps: true })
export class MarketingTrigger {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: String, enum: TriggerEventType, required: true })
  eventType: TriggerEventType;

  @Prop({ type: String, enum: TriggerStatus, default: TriggerStatus.ACTIVE })
  status: TriggerStatus;

  // Campaign to launch when triggered
  @Prop({ type: Types.ObjectId, ref: "MarketingCampaign", required: true })
  campaignId: Types.ObjectId;

  // Trigger conditions (varies by event type)
  @Prop({ type: Object })
  conditions: {
    // For CART_ABANDONED
    abandonmentMinutes?: number; // Wait X minutes before sending

    // For INACTIVITY
    inactiveDays?: number; // Customer inactive for X days

    // For PURCHASE_MILESTONE
    milestoneCount?: number; // Trigger after X purchases
    milestoneAmount?: number; // Trigger after spending $X

    // For PRODUCT_BACK_IN_STOCK
    productIds?: string[]; // Specific products

    // For TIER_UPGRADE
    targetTiers?: string[]; // diamante, oro, plata, bronce

    // Generic filters
    customerSegment?: {
      tiers?: string[];
      minSpent?: number;
      maxSpent?: number;
    };
  };

  // Execution settings
  @Prop({ type: Object, default: {} })
  executionSettings: {
    maxExecutionsPerCustomer?: number; // Limit how many times a customer receives this trigger
    cooldownDays?: number; // Don't send again to same customer for X days
    preferredChannel?: string; // email, sms, whatsapp, push
    sendImmediately?: boolean; // Send now or queue for optimal time
    optimalTimeSend?: boolean; // Send at customer's best engagement time
  };

  // Analytics
  @Prop({ type: Number, default: 0 })
  totalTriggered: number;

  @Prop({ type: Number, default: 0 })
  totalSent: number;

  @Prop({ type: Number, default: 0 })
  totalConverted: number;

  @Prop({ type: Number, default: 0 })
  totalRevenue: number;

  @Prop({ type: Date })
  lastTriggeredAt: Date;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const MarketingTriggerSchema =
  SchemaFactory.createForClass(MarketingTrigger);

// Indexes for performance
MarketingTriggerSchema.index({ tenantId: 1, status: 1 });
MarketingTriggerSchema.index({ tenantId: 1, eventType: 1 });
MarketingTriggerSchema.index({ campaignId: 1 });
