import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IvaPurchaseBookDocument = IvaPurchaseBook & Document;

/**
 * Libro de Compras - Registro de operaciones de compra con IVA (SENIAT)
 * Cada entrada representa una factura de compra con su IVA soportado
 */
@Schema({ timestamps: true })
export class IvaPurchaseBook {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant', index: true })
  tenantId: Types.ObjectId;

  // ============ INFORMACIÓN DE PERÍODO ============
  @Prop({ required: true, type: Number, min: 1, max: 12 })
  month: number; // Mes fiscal (1-12)

  @Prop({ required: true, type: Number })
  year: number; // Año fiscal

  @Prop({ required: true, type: Date, index: true })
  operationDate: Date; // Fecha de la operación/factura

  // ============ INFORMACIÓN DEL PROVEEDOR ============
  @Prop({ required: true, type: Types.ObjectId, ref: 'Supplier' })
  supplierId: Types.ObjectId;

  @Prop({ required: true, type: String })
  supplierName: string; // Razón social del proveedor

  @Prop({ required: true, type: String })
  supplierRif: string; // RIF del proveedor (J-12345678-9)

  @Prop({ type: String })
  supplierAddress: string;

  // ============ INFORMACIÓN DE LA FACTURA ============
  @Prop({ required: true, type: String })
  invoiceNumber: string; // Número de factura

  @Prop({ required: true, type: String })
  invoiceControlNumber: string; // Número de control (obligatorio SENIAT)

  @Prop({ type: Date })
  invoiceDate: Date; // Fecha de emisión de la factura

  @Prop({ type: String })
  affectedInvoiceNumber: string; // Factura afectada (para notas de crédito/débito)

  @Prop({ type: String })
  affectedInvoiceControlNumber: string;

  @Prop({
    type: String,
    enum: ['purchase', 'import', 'service', 'debit_note', 'credit_note'],
    default: 'purchase',
  })
  transactionType: string; // Tipo de transacción

  // ============ MONTOS ============
  @Prop({ required: true, type: Number, default: 0 })
  baseAmount: number; // Base imponible (sin IVA)

  @Prop({ required: true, type: Number, default: 0, min: 0, max: 100 })
  ivaRate: number; // Tasa de IVA aplicada (0, 8, 16)

  @Prop({ required: true, type: Number, default: 0 })
  ivaAmount: number; // IVA de la compra (crédito fiscal)

  @Prop({ type: Number, default: 0 })
  withheldIvaAmount: number; // IVA retenido (si aplica)

  @Prop({ type: Number, default: 0 })
  totalAmount: number; // Total factura (base + IVA - retención)

  // ============ RETENCIONES ============
  @Prop({ type: Types.ObjectId, ref: 'IvaWithholding' })
  withholdingId: Types.ObjectId; // Retención asociada (si aplica)

  @Prop({ type: String })
  withholdingCertificate: string; // Número de comprobante de retención

  @Prop({ type: Number, min: 0, max: 100 })
  withholdingPercentage: number; // % de retención (75 o 100)

  // ============ REFERENCIAS ============
  @Prop({ type: Types.ObjectId, ref: 'PurchaseOrder' })
  purchaseOrderId: Types.ObjectId; // Orden de compra relacionada

  @Prop({ type: Types.ObjectId, ref: 'Payable' })
  payableId: Types.ObjectId; // Cuenta por pagar relacionada

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry' })
  journalEntryId: Types.ObjectId; // Asiento contable

  // ============ ESTADO Y EXPORTACIÓN ============
  @Prop({
    type: String,
    enum: ['draft', 'confirmed', 'exported'],
    default: 'confirmed',
  })
  status: string;

  @Prop({ type: Boolean, default: false })
  exportedToSENIAT: boolean; // Marcado como exportado

  @Prop({ type: Date })
  exportDate: Date; // Fecha de exportación

  // ============ OBSERVACIONES ============
  @Prop({ type: String })
  observations: string;

  // ============ AUDITORÍA ============
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;
}

export const IvaPurchaseBookSchema = SchemaFactory.createForClass(IvaPurchaseBook);

// Índices para optimizar consultas
IvaPurchaseBookSchema.index({ tenantId: 1, month: 1, year: 1 });
IvaPurchaseBookSchema.index({ tenantId: 1, operationDate: -1 });
IvaPurchaseBookSchema.index({ tenantId: 1, supplierRif: 1 });
IvaPurchaseBookSchema.index({ tenantId: 1, invoiceNumber: 1 });
IvaPurchaseBookSchema.index({ tenantId: 1, status: 1 });
