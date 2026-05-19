import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type StripePaymentIntentDocument = StripePaymentIntent & Document;

export enum StripePaymentIntentStatus {
  REQUIRES_PAYMENT_METHOD = "requires_payment_method",
  REQUIRES_CONFIRMATION = "requires_confirmation",
  REQUIRES_ACTION = "requires_action",
  PROCESSING = "processing",
  SUCCEEDED = "succeeded",
  CANCELED = "canceled",
  REQUIRES_CAPTURE = "requires_capture",
}

@Schema({ timestamps: true, collection: "stripepaymentintents" })
export class StripePaymentIntent {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: Types.ObjectId, ref: "Order", required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ type: String, required: true })
  orderNumber: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  stripePaymentIntentId: string;

  @Prop({ type: Number, required: true })
  amountCents: number;

  @Prop({ type: String, required: true, default: "usd" })
  currency: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(StripePaymentIntentStatus),
    default: StripePaymentIntentStatus.REQUIRES_PAYMENT_METHOD,
    index: true,
  })
  status: string;

  @Prop({ type: Boolean, required: true, default: false })
  livemode: boolean;

  @Prop({ type: String })
  customerEmail?: string;

  @Prop({ type: String })
  customerName?: string;

  @Prop({ type: String })
  stripeCustomerId?: string;

  @Prop({ type: String })
  stripeChargeId?: string;

  @Prop({ type: String })
  receiptUrl?: string;

  @Prop({ type: String })
  paymentMethodType?: string;

  @Prop({ type: String })
  cardBrand?: string;

  @Prop({ type: String })
  cardLast4?: string;

  @Prop({ type: Boolean, default: false })
  webhookProcessed: boolean;

  @Prop({ type: Date })
  webhookProcessedAt?: Date;

  @Prop({
    type: [
      {
        eventId: { type: String, required: true },
        eventType: { type: String, required: true },
        receivedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  processedWebhookEvents: Array<{
    eventId: string;
    eventType: string;
    receivedAt: Date;
  }>;

  @Prop({
    type: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        eventType: { type: String },
        errorMessage: { type: String },
      },
    ],
    default: [],
  })
  statusHistory: Array<{
    status: string;
    changedAt: Date;
    eventType?: string;
    errorMessage?: string;
  }>;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Object })
  lastError?: Record<string, any>;
}

export const StripePaymentIntentSchema =
  SchemaFactory.createForClass(StripePaymentIntent);

StripePaymentIntentSchema.index({ tenantId: 1, status: 1 });
StripePaymentIntentSchema.index({ tenantId: 1, createdAt: -1 });
StripePaymentIntentSchema.index(
  { orderId: 1 },
  { unique: true, partialFilterExpression: { orderId: { $exists: true } } },
);
