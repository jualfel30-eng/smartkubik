import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * PHASE 7: EMAIL/SMS TEMPLATES & DELIVERY SYSTEM
 * MessageDelivery - Tracking de envíos de mensajes
 *
 * Este schema registra todos los intentos de envío de mensajes (email/SMS/WhatsApp)
 * para auditoría, análisis y re-intentos.
 */

export type MessageDeliveryDocument = MessageDelivery & Document;

@Schema({ timestamps: true })
export class MessageDelivery {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  // Reference to campaign (if sent as part of a campaign)
  @Prop({ type: Types.ObjectId, ref: "ProductCampaign", index: true })
  campaignId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "MarketingCampaign", index: true })
  marketingCampaignId?: Types.ObjectId;

  // Reference to customer
  @Prop({ type: Types.ObjectId, ref: "Customer", required: true, index: true })
  customerId: Types.ObjectId;

  @Prop()
  customerName?: string;

  // Reference to template used
  @Prop({ type: Types.ObjectId, ref: "EmailTemplate", index: true })
  templateId?: Types.ObjectId;

  @Prop()
  templateName?: string;

  // Message Details
  @Prop({
    type: String,
    enum: ["email", "sms", "whatsapp"],
    required: true,
    index: true,
  })
  channel: string;

  @Prop({ required: true })
  recipient: string; // Email address, phone number, or WhatsApp ID

  @Prop()
  subject?: string; // For emails

  @Prop({ required: true })
  message: string; // Text content or rendered HTML

  @Prop()
  htmlContent?: string; // For emails with HTML

  // Delivery Status
  @Prop({
    type: String,
    enum: ["queued", "sent", "delivered", "failed", "bounced", "rejected"],
    default: "queued",
    required: true,
    index: true,
  })
  status: string;

  // Timestamps
  @Prop({ type: Date, default: Date.now })
  queuedAt: Date;

  @Prop({ type: Date, index: true })
  sentAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: Date })
  failedAt?: Date;

  @Prop({ type: Date })
  bouncedAt?: Date;

  @Prop({ type: Date, index: true })
  openedAt?: Date; // Email tracking

  @Prop({ type: Date })
  clickedAt?: Date; // Email tracking

  // Provider Response
  @Prop()
  providerMessageId?: string; // ID from SendGrid, Twilio, Whapi, etc.

  @Prop()
  provider?: string; // sendgrid, twilio, whapi, ses

  @Prop({ type: Object })
  providerResponse?: Record<string, any>;

  // Error Handling
  @Prop()
  errorMessage?: string;

  @Prop()
  errorCode?: string;

  @Prop({ type: Number, default: 0 })
  retryCount: number;

  @Prop({ type: Date })
  lastRetryAt?: Date;

  @Prop({ type: Number, default: 3 })
  maxRetries: number;

  @Prop({ type: Boolean, default: false })
  canRetry: boolean;

  // Cost Tracking (optional)
  @Prop({ type: Number, default: 0 })
  cost: number; // Cost in cents/credits

  @Prop({ default: "USD" })
  currency: string;

  // Engagement Tracking (for emails)
  @Prop({ type: Number, default: 0 })
  openCount: number;

  @Prop({ type: Number, default: 0 })
  clickCount: number;

  @Prop({ type: [String] })
  clickedLinks?: string[];

  // Campaign Variant (for A/B testing)
  @Prop()
  variantName?: string;

  // Metadata
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  notes?: string;
}

export const MessageDeliverySchema =
  SchemaFactory.createForClass(MessageDelivery);

// Indexes compuestos para búsquedas eficientes
MessageDeliverySchema.index({ tenantId: 1, status: 1, createdAt: -1 });
MessageDeliverySchema.index({ tenantId: 1, campaignId: 1, status: 1 });
MessageDeliverySchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
MessageDeliverySchema.index({ tenantId: 1, channel: 1, status: 1 });
MessageDeliverySchema.index({
  tenantId: 1,
  providerMessageId: 1,
}); // For webhook callbacks
MessageDeliverySchema.index({ tenantId: 1, sentAt: -1 }); // For analytics
