import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WithholdingDocumentDocument = WithholdingDocument & Document;

/**
 * Tipos de retención soportados
 */
export type WithholdingType = 'iva' | 'islr' | 'arcv';

/**
 * Estados del documento de retención
 */
export type WithholdingStatus =
  | 'draft'
  | 'validated'
  | 'issued'
  | 'sent'
  | 'archived'
  | 'cancelled';

/**
 * Porcentajes de retención IVA según SENIAT
 */
export const IVA_RETENTION_PERCENTAGES = {
  75: 0.75, // 75% de retención
  100: 1.0, // 100% de retención
} as const;

/**
 * Schema para documentos de retención (IVA e ISLR)
 * Tipo 05: Retención IVA
 * Tipo 06: Retención ISLR
 */
@Schema({ timestamps: true })
export class WithholdingDocument {
  @Prop({ type: String, required: true })
  type: WithholdingType; // 'iva' o 'islr'

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'DocumentSequence', required: true })
  seriesId: Types.ObjectId;

  @Prop({ type: String, required: true })
  documentNumber: string; // Número secuencial del comprobante

  @Prop({ type: String })
  controlNumber?: string; // Número de control fiscal (si aplica)

  @Prop({ type: String, default: 'draft' })
  status: WithholdingStatus;

  @Prop({ type: Date })
  issueDate?: Date;

  @Prop({ type: Date })
  operationDate: Date; // Fecha de la operación que origina la retención

  // Documento Afectado (Factura que origina la retención)
  @Prop({ type: Types.ObjectId, ref: 'BillingDocument', required: true })
  affectedDocumentId: Types.ObjectId;

  @Prop({ type: Object })
  affectedDocument: {
    documentNumber: string;
    controlNumber?: string;
    issueDate: Date;
    totalAmount: number;
    series?: string;
  };

  // Proveedor (quien emite la retención - el comprador)
  @Prop({ type: Object, required: true })
  issuer: {
    name: string; // Razón social
    taxId: string; // RIF (J-XXXXXXXX-X)
    address?: string;
    phone?: string;
    email?: string;
  };

  // Beneficiario (a quien se le retiene - el vendedor)
  @Prop({ type: Object, required: true })
  beneficiary: {
    name: string; // Razón social
    taxId: string; // RIF
    address?: string;
    phone?: string;
    email?: string;
  };

  // Detalles de la Retención IVA
  @Prop({ type: Object })
  ivaRetention?: {
    baseAmount: number; // Base imponible gravada
    taxRate: number; // Alícuota del IVA (ej: 16%)
    taxAmount: number; // Monto del IVA
    retentionPercentage: number; // Porcentaje de retención (75% o 100%)
    retentionAmount: number; // Monto retenido
    taxCode?: string; // Código del impuesto (G, R, A, etc.)
  };

  // Detalles de la Retención ISLR
  @Prop({ type: Object })
  islrRetention?: {
    conceptCode: string; // Código del concepto ISLR (tabla SENIAT)
    conceptDescription: string;
    baseAmount: number; // Base imponible
    retentionPercentage: number; // Porcentaje según tabla
    retentionAmount: number; // Monto retenido
    sustraendo?: number; // Sustraendo (si aplica)
  };

  // Detalles de Retenciones Varias (ARCV - tipo 07)
  @Prop({ type: Object })
  arcvRetention?: {
    retentionType: string; // Tipo de retención (municipal, otros)
    conceptCode?: string; // Código del concepto
    conceptDescription: string; // Descripción del concepto
    baseAmount: number; // Base imponible
    retentionPercentage: number; // Porcentaje de retención
    retentionAmount: number; // Monto retenido
    taxCode?: string; // Código impositivo
    period?: string; // Período de retención (YYYY-MM)
    fiscalYearEnd?: Date; // Fecha de cierre del ejercicio fiscal
  };

  // Totales
  @Prop({ type: Object, required: true })
  totals: {
    subtotal: number; // Subtotal de la factura afectada
    totalTax: number; // Total IVA de la factura
    totalRetention: number; // Total retenido
    currency: string; // BSD, USD, EUR
    exchangeRate?: number; // Tasa de cambio (si aplica)
  };

  // Información Fiscal
  @Prop({ type: Object })
  taxInfo?: {
    period: string; // Período fiscal (YYYY-MM)
    declarationNumber?: string; // Número de declaración
    verificationUrl?: string;
    qrCode?: string;
  };

  // Metadata adicional
  @Prop({ type: Object })
  metadata?: {
    series?: string;
    hkaJson?: any; // JSON mapeado para HKA Factory
    notes?: string;
    [key: string]: any;
  };

  // Referencias
  @Prop({ type: Object })
  references?: {
    purchaseOrderId?: Types.ObjectId;
    paymentId?: Types.ObjectId;
    [key: string]: any;
  };

  // Auditoría
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  issuedBy?: Types.ObjectId;
}

export const WithholdingDocumentSchema = SchemaFactory.createForClass(
  WithholdingDocument,
);

// Índices para optimizar queries
WithholdingDocumentSchema.index({ tenantId: 1, documentNumber: 1 });
WithholdingDocumentSchema.index({ tenantId: 1, status: 1 });
WithholdingDocumentSchema.index({ tenantId: 1, type: 1 });
WithholdingDocumentSchema.index({ tenantId: 1, affectedDocumentId: 1 });
WithholdingDocumentSchema.index({ controlNumber: 1 });
WithholdingDocumentSchema.index({ 'issuer.taxId': 1 });
WithholdingDocumentSchema.index({ 'beneficiary.taxId': 1 });
WithholdingDocumentSchema.index({ issueDate: -1 });
WithholdingDocumentSchema.index({ operationDate: -1 });
