import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PaymentRequestDocument = PaymentRequest & Document;

export type PaymentRequestStatus =
  | "pending"
  | "submitted"
  | "confirmed"
  | "info_mismatch"
  | "proof_unclear"
  | "partial"
  | "awaiting_settlement"
  | "rejected_final"
  | "expired";

export const PAYMENT_REQUEST_STATUSES: PaymentRequestStatus[] = [
  "pending",
  "submitted",
  "confirmed",
  "info_mismatch",
  "proof_unclear",
  "partial",
  "awaiting_settlement",
  "rejected_final",
  "expired",
];

export type PaymentRequestEntityType = "order" | "appointment" | "invoice";

export type PaymentRequestDeliveryChannel =
  | "whatsapp"
  | "manual"
  | "pending_manual";

export type PaymentProofMethod =
  | "transfer"
  | "pago_movil"
  | "zelle"
  | "cash"
  | "card";

export type PaymentProofReviewStatus = "pending" | "accepted" | "rejected";

/**
 * Reject typology — the spec is explicit: rejections drive different customer
 * experiences. Each value maps to a distinct portal re-entry view and a
 * specific WhatsApp message tone.
 */
export type PaymentRequestRejectReason =
  | "info_mismatch"
  | "proof_unclear"
  | "partial"
  | "awaiting_settlement"
  | "rejected_final";

@Schema({ _id: false })
export class PaymentRequestItemSnapshot {
  @Prop({ type: String }) name?: string;
  @Prop({ type: Number, default: 0 }) qty: number;
  @Prop({ type: Number, default: 0 }) unitPrice: number;
  @Prop({ type: Number, default: 0 }) total: number;
}
export const PaymentRequestItemSnapshotSchema = SchemaFactory.createForClass(
  PaymentRequestItemSnapshot,
);

@Schema({ _id: false })
export class PaymentRequestEntitySnapshot {
  @Prop({ type: [PaymentRequestItemSnapshotSchema], default: [] })
  items: PaymentRequestItemSnapshot[];

  @Prop({ type: Number, default: 0 }) subtotal: number;
  @Prop({ type: Number, default: 0 }) tax: number;
  @Prop({ type: Number, default: 0 }) total: number;
  @Prop({ type: String }) customerName?: string;
  @Prop({ type: String }) customerPhone?: string;
  @Prop({ type: Date }) createdAt?: Date;
}
export const PaymentRequestEntitySnapshotSchema = SchemaFactory.createForClass(
  PaymentRequestEntitySnapshot,
);

@Schema({ _id: false })
export class PaymentRequestSelectedMethod {
  @Prop({
    type: String,
    required: true,
    enum: ["transfer", "pago_movil", "zelle", "cash", "card"],
  })
  type: PaymentProofMethod;

  /**
   * Copied verbatim from TenantPaymentConfig.paymentMethods[].accountDetails
   * at PaymentRequest creation time. Frozen so portal renders the right info
   * even if the tenant later edits or removes the method.
   */
  @Prop({ type: Object, default: {} })
  accountDetails: Record<string, any>;

  @Prop({ type: String, required: true })
  label: string;

  /**
   * Original methodId from TenantPaymentConfig (e.g. "transferencia_usd",
   * "pago_movil_ves"). Useful when we later generate a Payment record and
   * need to honor the existing method convention.
   */
  @Prop({ type: String })
  methodId?: string;
}
export const PaymentRequestSelectedMethodSchema = SchemaFactory.createForClass(
  PaymentRequestSelectedMethod,
);

@Schema({ _id: false })
export class PaymentRequestDelivery {
  @Prop({
    type: String,
    required: true,
    enum: ["whatsapp", "manual", "pending_manual"],
    default: "pending_manual",
  })
  channel: PaymentRequestDeliveryChannel;

  @Prop({ type: String }) deliveredTo?: string;
  @Prop({ type: Date }) deliveredAt?: Date;
  @Prop({ type: Number, default: 0 }) deliveryAttempts: number;
  @Prop({ type: String }) lastError?: string;
}
export const PaymentRequestDeliverySchema = SchemaFactory.createForClass(
  PaymentRequestDelivery,
);

@Schema({ _id: false })
export class PaymentRequestOcrExtracted {
  @Prop({ type: Number }) amount?: number;
  @Prop({ type: String }) reference?: string;
  @Prop({ type: String }) date?: string;
  @Prop({ type: Number, default: 0 }) confidence: number;
}
export const PaymentRequestOcrExtractedSchema = SchemaFactory.createForClass(
  PaymentRequestOcrExtracted,
);

@Schema({ timestamps: false })
export class PaymentRequestProof {
  _id?: Types.ObjectId;

  @Prop({ type: Date, default: () => new Date() })
  submittedAt: Date;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true, enum: ["USD", "VES"] })
  currency: "USD" | "VES";

  @Prop({
    type: String,
    required: true,
    enum: ["transfer", "pago_movil", "zelle", "cash", "card"],
  })
  method: PaymentProofMethod;

  @Prop({ type: String, default: "" }) originBank: string;
  @Prop({ type: String, default: "" }) payerIdNumber: string;
  @Prop({ type: String, default: "" }) payerPhone: string;
  @Prop({ type: String, default: "" }) referenceNumber: string;

  @Prop({ type: String, required: true })
  imageUrl: string;

  /**
   * SHA-256 of the optimized webp bytes. Used in PR1 for exact-duplicate
   * detection. Will be replaced/augmented with a perceptual hash in a
   * follow-up (the schema name "imageHash" is intentionally generic).
   */
  @Prop({ type: String, default: "" })
  imageHash: string;

  @Prop({ type: PaymentRequestOcrExtractedSchema })
  ocrExtracted?: PaymentRequestOcrExtracted;

  @Prop({
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  })
  reviewStatus: PaymentProofReviewStatus;

  @Prop({ type: Date }) reviewedAt?: Date;
  @Prop({ type: Types.ObjectId, ref: "User" }) reviewedBy?: Types.ObjectId;
  @Prop({ type: String }) reviewNote?: string;
}
export const PaymentRequestProofSchema = SchemaFactory.createForClass(
  PaymentRequestProof,
);

@Schema({ _id: false })
export class PaymentRequestEvent {
  @Prop({ type: Date, default: () => new Date() })
  at: Date;

  @Prop({
    type: String,
    required: true,
    enum: ["customer", "tenant", "system"],
  })
  actor: "customer" | "tenant" | "system";

  @Prop({ type: Types.ObjectId, ref: "User" })
  actorId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: Object, default: {} })
  payload: Record<string, any>;
}
export const PaymentRequestEventSchema = SchemaFactory.createForClass(
  PaymentRequestEvent,
);

@Schema({ timestamps: true })
export class PaymentRequest {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  // ─── Polymorphic link ──────────────────────────────────────────────────
  @Prop({
    type: String,
    required: true,
    enum: ["order", "appointment", "invoice"],
  })
  entityType: PaymentRequestEntityType;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  entityId: Types.ObjectId;

  @Prop({ type: PaymentRequestEntitySnapshotSchema, required: true })
  entitySnapshot: PaymentRequestEntitySnapshot;

  // ─── Amount expected ───────────────────────────────────────────────────
  @Prop({ type: Number, required: true })
  amountDue: number;

  @Prop({ type: String, required: true, enum: ["USD", "VES"] })
  currency: "USD" | "VES";

  @Prop({ type: Number })
  exchangeRateSnapshot?: number;

  // ─── Method ────────────────────────────────────────────────────────────
  @Prop({ type: PaymentRequestSelectedMethodSchema, required: true })
  selectedMethod: PaymentRequestSelectedMethod;

  @Prop({ type: Boolean, default: false })
  allowMethodOverride: boolean;

  // ─── Settings ──────────────────────────────────────────────────────────
  @Prop({ type: Boolean, default: false })
  allowPartialPayments: boolean;

  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;

  // ─── Token ─────────────────────────────────────────────────────────────
  @Prop({ type: String, required: true, unique: true })
  token: string;

  @Prop({ type: Date, default: () => new Date() })
  tokenIssuedAt: Date;

  // ─── Delivery ──────────────────────────────────────────────────────────
  @Prop({ type: PaymentRequestDeliverySchema, default: () => ({}) })
  delivery: PaymentRequestDelivery;

  // ─── State ─────────────────────────────────────────────────────────────
  @Prop({
    type: String,
    required: true,
    enum: PAYMENT_REQUEST_STATUSES,
    default: "pending",
    index: true,
  })
  status: PaymentRequestStatus;

  // ─── Proofs ────────────────────────────────────────────────────────────
  @Prop({ type: [PaymentRequestProofSchema], default: [] })
  proofs: PaymentRequestProof[];

  // ─── Audit trail ───────────────────────────────────────────────────────
  @Prop({ type: [PaymentRequestEventSchema], default: [] })
  events: PaymentRequestEvent[];

  // ─── Linked Payment ledger entries (filled on confirm) ─────────────────
  @Prop({ type: [Types.ObjectId], ref: "Payment", default: [] })
  paymentIds: Types.ObjectId[];

  // ─── Soft-delete (matches project convention: isDeleted boolean) ───────
  @Prop({ type: Boolean, default: false, index: true })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;
}

export const PaymentRequestSchema = SchemaFactory.createForClass(PaymentRequest);

PaymentRequestSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
PaymentRequestSchema.index({ tenantId: 1, entityType: 1, entityId: 1 });
PaymentRequestSchema.index({ tenantId: 1, "proofs.imageHash": 1 });
PaymentRequestSchema.index({ expiresAt: 1 });
