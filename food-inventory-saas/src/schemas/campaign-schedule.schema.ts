import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export enum ScheduleType {
  IMMEDIATE = "immediate",
  SCHEDULED = "scheduled",
  RECURRING = "recurring",
}

export enum RecurrenceFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  CUSTOM = "custom",
}

export enum ScheduleStatus {
  PENDING = "pending",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Schema({ timestamps: true })
export class CampaignSchedule {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "MarketingCampaign", required: true })
  campaignId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, enum: ScheduleType, default: ScheduleType.IMMEDIATE })
  type: ScheduleType;

  // For scheduled campaigns
  @Prop()
  scheduledAt: Date; // Single execution date/time

  // For recurring campaigns
  @Prop({ type: String, enum: RecurrenceFrequency })
  recurrenceFrequency?: RecurrenceFrequency;

  @Prop({ type: Number })
  recurrenceInterval?: number; // e.g., every 2 weeks = 2

  @Prop({ type: [Number] }) // Days of week (0=Sunday, 6=Saturday)
  recurrenceDaysOfWeek?: number[];

  @Prop({ type: Number }) // Day of month (1-31)
  recurrenceDayOfMonth?: number;

  @Prop()
  recurrenceEndDate?: Date;

  @Prop({ type: String }) // Cron expression for custom schedules
  cronExpression?: string;

  // Timezone
  @Prop({ default: "UTC" })
  timezone: string;

  // Status
  @Prop({ type: String, enum: ScheduleStatus, default: ScheduleStatus.PENDING })
  status: ScheduleStatus;

  // Execution tracking
  @Prop({ type: Date })
  lastExecutedAt?: Date;

  @Prop({ type: Date })
  nextExecutionAt?: Date;

  @Prop({ type: Number, default: 0 })
  executionCount: number;

  @Prop({ type: Number })
  maxExecutions?: number; // Limit for recurring campaigns

  // Execution details
  @Prop({ type: [{ executedAt: Date, success: Boolean, error: String }] })
  executionHistory: {
    executedAt: Date;
    success: boolean;
    error?: string;
  }[];

  // Send conditions
  @Prop({ type: Boolean, default: true })
  enabled: boolean;

  @Prop({ type: Object })
  filters?: {
    segmentId?: string;
    customerTiers?: string[];
    minOrderValue?: number;
    maxOrderValue?: number;
    lastOrderDaysAgo?: number;
  };
}

export type CampaignScheduleDocument = CampaignSchedule & Document;
export const CampaignScheduleSchema =
  SchemaFactory.createForClass(CampaignSchedule);

// Indexes
CampaignScheduleSchema.index({ tenantId: 1, campaignId: 1 });
CampaignScheduleSchema.index({ nextExecutionAt: 1, status: 1 });
CampaignScheduleSchema.index({ status: 1, enabled: 1 });
