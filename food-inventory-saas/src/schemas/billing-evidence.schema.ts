import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type BillingEvidenceDocument = BillingEvidence & Document;

@Schema({ timestamps: true })
export class BillingEvidence {
  @Prop({ type: Types.ObjectId, ref: "BillingDocument", required: true })
  documentId: Types.ObjectId;

  @Prop({ type: String })
  hash?: string; // SHA-256 del payload emitido

  @Prop({ type: Object })
  imprenta?: {
    controlNumber?: string;
    provider?: string;
    providerRif?: string;
    providerName?: string;
    assignedAt?: Date;
    metadata?: Record<string, any>;
  };

  @Prop({ type: Object })
  imprentaRequest?: Record<string, any>;

  @Prop({ type: Object })
  imprentaResponse?: Record<string, any>;

  @Prop({ type: String })
  verificationUrl?: string;

  @Prop({ type: String })
  xml?: string; // XML SENIAT generado (para Venezuela)

  @Prop({ type: String })
  xmlHash?: string; // Hash SHA-256 del XML para validación de integridad

  @Prop({ type: Object })
  totalsSnapshot?: {
    subtotal?: number;
    taxes?: {
      type: string;
      rate: number;
      amount: number;
      base?: number;
      currency?: string;
    }[];
    discounts?: number;
    charges?: number;
    grandTotal?: number;
    currency?: string;
    exchangeRate?: number;
  };

  @Prop({ type: Object })
  files?: {
    pdfUrl?: string;
    xmlJsonUrl?: string;
  };

  @Prop({ type: Object })
  delivery?: {
    channel?: string;
    sentAt?: Date;
    deliveryProof?: Record<string, any>;
  };

  @Prop({ type: Date })
  retentionUntil?: Date; // 10 años por defecto

  @Prop({ type: String, ref: "Tenant", required: true })
  tenantId: string;
}

export const BillingEvidenceSchema =
  SchemaFactory.createForClass(BillingEvidence);

BillingEvidenceSchema.index({ tenantId: 1, "imprenta.controlNumber": 1 });
