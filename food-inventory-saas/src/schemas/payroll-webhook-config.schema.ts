import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PayrollWebhookConfigDocument = PayrollWebhookConfig & Document;

@Schema({ timestamps: true })
export class PayrollWebhookConfig {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true })
  endpointUrl: string;

  @Prop({ type: String, required: true })
  secret: string;

  @Prop({ type: Boolean, default: true })
  enabled: boolean;

  @Prop({ type: Number, default: 3 })
  maxRetries?: number;

  @Prop({ type: Number, default: 2000 })
  retryDelayMs?: number;

  @Prop({ type: Date })
  lastAttemptAt?: Date;

  @Prop({ type: Number })
  lastStatusCode?: number;

  @Prop({ type: String })
  lastError?: string;
}

export const PayrollWebhookConfigSchema =
  SchemaFactory.createForClass(PayrollWebhookConfig);
PayrollWebhookConfigSchema.index({ tenantId: 1 }, { unique: true });
