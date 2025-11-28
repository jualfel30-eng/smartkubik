import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type BillingAuditLogDocument = BillingAuditLog & Document;

export type BillingAuditEvent =
  | "created"
  | "validated"
  | "sent_to_imprenta"
  | "control_assigned"
  | "issued"
  | "sent"
  | "retry"
  | "error"
  | "adjusted"
  | "closed";

@Schema({ timestamps: true })
export class BillingAuditLog {
  @Prop({ type: Types.ObjectId, ref: "BillingDocument", required: true })
  documentId: Types.ObjectId;

  @Prop({ type: String, required: true })
  event: BillingAuditEvent;

  @Prop({ type: Object })
  payload?: Record<string, any>;

  @Prop({ type: Object })
  diff?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: "User" })
  userId?: Types.ObjectId;

  @Prop({ type: String, ref: "Tenant", required: true })
  tenantId: string;
}

export const BillingAuditLogSchema =
  SchemaFactory.createForClass(BillingAuditLog);

BillingAuditLogSchema.index({ tenantId: 1, documentId: 1, event: 1 });
