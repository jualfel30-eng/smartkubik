import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TriggerExecutionLogDocument = TriggerExecutionLog & Document;

/**
 * TriggerExecutionLog - Tracks each trigger execution
 *
 * Prevents duplicate sends and provides audit trail
 */

export enum ExecutionStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
  SKIPPED = "skipped", // Skipped due to cooldown or max executions
}

@Schema({ timestamps: true })
export class TriggerExecutionLog {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "MarketingTrigger",
    required: true,
    index: true,
  })
  triggerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "MarketingCampaign", required: true })
  campaignId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ required: true })
  eventType: string;

  @Prop({ type: Object })
  eventData: any; // Cart items, order info, etc.

  @Prop({
    type: String,
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
  })
  status: ExecutionStatus;

  @Prop({ type: Date })
  scheduledFor: Date; // When to send (for delayed triggers)

  @Prop({ type: Date })
  sentAt: Date;

  @Prop()
  errorMessage: string;

  @Prop({ type: Object })
  metadata: {
    channel?: string;
    messageId?: string;
    revenue?: number; // If converted
  };

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const TriggerExecutionLogSchema =
  SchemaFactory.createForClass(TriggerExecutionLog);

// Compound indexes for performance
TriggerExecutionLogSchema.index({ tenantId: 1, customerId: 1, triggerId: 1 });
TriggerExecutionLogSchema.index({ tenantId: 1, status: 1, scheduledFor: 1 });
TriggerExecutionLogSchema.index({ triggerId: 1, createdAt: -1 });
