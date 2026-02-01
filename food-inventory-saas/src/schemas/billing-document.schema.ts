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

  // SENIAT Electronic Invoicing Information
  @Prop({ type: Object })
  seniat?: {
    xmlGenerated?: boolean;
    xmlGeneratedAt?: Date;
    xmlHash?: string; // SHA-256 hash del XML para integridad
    qrCode?: string; // Código QR en base64
    verificationUrl?: string; // URL de verificación SENIAT
    transmissionDate?: Date; // Fecha de transmisión a SENIAT
    responseCode?: string; // Código de respuesta SENIAT
    responseMessage?: string; // Mensaje de respuesta SENIAT
    validationErrors?: string[]; // Errores de validación si los hay
  };

  // Withholding Agent Information (Agente de Retención)
  @Prop({ type: Object })
  withholdingAgent?: {
    isAgent?: boolean; // Si el emisor es agente de retención
    registrationNumber?: string; // Número de registro como agente
    resolutionNumber?: string; // Número de resolución SENIAT
    resolutionDate?: Date; // Fecha de la resolución
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
    email?: string;
    phone?: string;
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

  /** Montos equivalentes en VES, calculados al emitir (issue) usando la tasa BCV del momento */
  @Prop({ type: Object })
  totalsVes?: {
    subtotal: number;
    taxAmount: number;
    grandTotal: number;
    exchangeRate: number;
  };

  @Prop({
    type: [
      {
        product: { type: Types.ObjectId, ref: "Product" },
        description: String,
        quantity: Number,
        unitPrice: Number,
        discount: {
          type: { type: String, enum: ["percentage", "amount"] },
          value: Number,
        },
        tax: {
          type: { type: String, enum: ["IVA", "IGTF", "Exento"] },
          rate: Number,
        },
        total: Number,
      },
    ],
  })
  items: Array<{
    product: Types.ObjectId;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: {
      type: "percentage" | "amount";
      value: number;
    };
    tax?: {
      type: "IVA" | "IGTF" | "Exento";
      rate: number;
    };
    total: number;
  }>;

  @Prop({
    type: [
      {
        taxType: { type: String, enum: ['IVA', 'IGTF', 'ISLR'] },
        taxSettingsId: { type: Types.ObjectId, ref: 'TaxSettings' },
        rate: Number,
        baseAmount: Number,
        amount: Number,
      },
    ],
  })
  taxDetails?: Array<{
    taxType: string;
    taxSettingsId?: Types.ObjectId;
    rate: number;
    baseAmount: number;
    amount: number;
  }>;

  @Prop({ type: Boolean, default: false })
  requiresIvaWithholding?: boolean; // Cliente es agente de retención

  @Prop({ type: Number, default: 0 })
  withheldIvaAmount?: number; // Monto de IVA retenido por el cliente

  @Prop({ type: Number, default: 0 })
  withheldIvaPercentage?: number; // Porcentaje de retención (75 o 100)

  @Prop({ type: String })
  withholdingCertificate?: string; // Número de comprobante de retención recibida

  @Prop({ type: Date })
  withholdingDate?: Date; // Fecha en que se practicó la retención

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
