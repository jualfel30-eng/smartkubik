import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type BillingDocumentDocument = BillingDocument & Document;

export type BillingDocumentType =
  | "invoice"
  | "credit_note"
  | "debit_note"
  | "delivery_note"
  | "quote";

export type BillingDocumentStatus =
  | "draft"
  | "validated"
  | "sent_to_imprenta"
  | "issued"
  | "sent"
  | "adjusted"
  | "closed"
  | "archived";

@Schema({ timestamps: true })
export class BillingDocument {
  @Prop({ type: String, required: true })
  type: BillingDocumentType;

  @Prop({ type: Types.ObjectId, ref: "DocumentSequence", required: true })
  seriesId: Types.ObjectId;

  @Prop({ type: String, required: true })
  documentNumber: string;

  @Prop({ type: String })
  controlNumber?: string; // Asignado por imprenta digital (VE)

  @Prop({ type: String })
  verificationUrl?: string; // URL de verificación del documento fiscal

  @Prop({ type: Object })
  taxInfo?: {
    verificationUrl?: string;
    qrCode?: string;
    fiscalStamp?: string;
  };

  @Prop({ type: String, required: true, default: "draft" })
  status: BillingDocumentStatus;

  @Prop({ type: Date })
  issueDate?: Date;

  @Prop({ type: Object })
  customer?: {
    name?: string;
    taxId?: string;
    address?: string;
  };

  @Prop({ type: Object })
  emitter?: {
    businessName?: string;
    taxId?: string;
    fiscalAddress?: string;
  };

  @Prop({ type: Object })
  totals?: {
    subtotal?: number;
    taxes?: { type: string; rate: number; amount: number }[];
    discounts?: number;
    charges?: number;
    grandTotal?: number;
    currency?: string;
    exchangeRate?: number;
  };

  @Prop({ type: Object })
  paymentTerms?: {
    type?: "contado" | "credito";
    dueDate?: Date;
  };

  @Prop({ type: Object })
  references?: {
    orderId?: string;
    originalDocumentId?: Types.ObjectId; // Para notas de crédito/débito
  };

  @Prop({ type: String })
  country?: string; // ISO code

  @Prop({ type: String })
  adapterVersion?: string;

  @Prop({ type: Types.ObjectId, ref: "BillingEvidence" })
  evidenceId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "BillingAuditLog" })
  auditLogId?: Types.ObjectId;

  @Prop({ type: String, ref: "Tenant", required: true })
  tenantId: string;
}

export const BillingDocumentSchema =
  SchemaFactory.createForClass(BillingDocument);

BillingDocumentSchema.index(
  { tenantId: 1, seriesId: 1, documentNumber: 1 },
  { unique: true },
);

BillingDocumentSchema.index({ tenantId: 1, controlNumber: 1 });
