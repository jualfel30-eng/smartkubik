import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IvaSalesBookDocument = IvaSalesBook & Document;

/**
 * Libro de Ventas - Registro de operaciones de venta con IVA (SENIAT)
 * Cada entrada representa una factura emitida con su IVA cobrado
 */
@Schema({ timestamps: true })
export class IvaSalesBook {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant', index: true })
  tenantId: Types.ObjectId;

  // ============ INFORMACIÓN DE PERÍODO ============
  @Prop({ required: true, type: Number, min: 1, max: 12 })
  month: number; // Mes fiscal (1-12)

  @Prop({ required: true, type: Number })
  year: number; // Año fiscal

  @Prop({ required: true, type: Date, index: true })
  operationDate: Date; // Fecha de la operación/factura

  // ============ INFORMACIÓN DEL CLIENTE ============
  @Prop({ required: false, type: Types.ObjectId, ref: 'Customer' })
  customerId: Types.ObjectId;

  @Prop({ required: true, type: String })
  customerName: string; // Razón social del cliente

  @Prop({ required: true, type: String })
  customerRif: string; // RIF del cliente (J-12345678-9, V-12345678)

  @Prop({ type: String })
  customerAddress: string;

  // ============ INFORMACIÓN DE LA FACTURA ============
  @Prop({ required: true, type: String, unique: true })
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
    enum: ['sale', 'export', 'service', 'debit_note', 'credit_note'],
    default: 'sale',
  })
  transactionType: string; // Tipo de transacción

  // ============ MONTOS ORIGINALES (Añadido para trazabilidad) ============
  @Prop({ type: String })
  originalCurrency: string; // 'USD' | 'VES'

  @Prop({ type: Number })
  exchangeRate: number; // Tasa de cambio aplicada

  @Prop({ type: Number, default: 0 })
  originalBaseAmount: number; // Monto base en moneda original

  @Prop({ type: Number, default: 0 })
  originalIvaAmount: number; // IVA en moneda original

  @Prop({ type: Number, default: 0 })
  originalTotalAmount: number; // Total en moneda original

  @Prop({ type: Boolean, default: false })
  isForeignCurrency: boolean;

  // ============ MONTOS ============
  @Prop({ required: true, type: Number, default: 0 })
  baseAmount: number; // Base imponible (sin IVA)

  @Prop({ required: true, type: Number, default: 0, min: 0, max: 100 })
  ivaRate: number; // Tasa de IVA aplicada (0, 8, 16)

  @Prop({ required: true, type: Number, default: 0 })
  ivaAmount: number; // IVA de la venta (débito fiscal)

  @Prop({ type: Number, default: 0 })
  withheldIvaAmount: number; // IVA retenido por el cliente (si aplica)

  @Prop({ type: Number, default: 0 })
  totalAmount: number; // Total factura (base + IVA - retención)

  // ============ RETENCIONES RECIBIDAS ============
  @Prop({ type: String })
  withholdingCertificate: string; // Número de comprobante de retención recibida

  @Prop({ type: Number, min: 0, max: 100 })
  withholdingPercentage: number; // % de retención (75 o 100)

  @Prop({ type: Date })
  withholdingDate: Date; // Fecha del comprobante de retención

  // ============ FACTURACIÓN ELECTRÓNICA ============
  @Prop({ type: Boolean, default: false })
  isElectronic: boolean; // Es factura electrónica

  @Prop({ type: String })
  electronicCode: string; // Código de autorización SENIAT

  @Prop({ type: String })
  qrCode: string; // Código QR de factura electrónica

  // ============ REFERENCIAS ============
  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId: Types.ObjectId; // Orden/pedido relacionado

  @Prop({ type: Types.ObjectId, ref: 'BillingDocument' })
  billingDocumentId: Types.ObjectId; // Documento de facturación

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry' })
  journalEntryId: Types.ObjectId; // Asiento contable

  // ============ ESTADO Y EXPORTACIÓN ============
  @Prop({
    type: String,
    enum: ['draft', 'confirmed', 'exported', 'annulled'],
    default: 'confirmed',
  })
  status: string;

  @Prop({ type: Boolean, default: false })
  exportedToSENIAT: boolean; // Marcado como exportado

  @Prop({ type: Date })
  exportDate: Date; // Fecha de exportación

  @Prop({ type: String })
  annulmentReason: string; // Razón de anulación

  @Prop({ type: Date })
  annulmentDate: Date;

  // ============ OBSERVACIONES ============
  @Prop({ type: String })
  observations: string;

  // ============ AUDITORÍA ============
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;
}

export const IvaSalesBookSchema = SchemaFactory.createForClass(IvaSalesBook);

// Índices para optimizar consultas
IvaSalesBookSchema.index({ tenantId: 1, month: 1, year: 1 });
IvaSalesBookSchema.index({ tenantId: 1, operationDate: -1 });
IvaSalesBookSchema.index({ tenantId: 1, customerRif: 1 });
IvaSalesBookSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
IvaSalesBookSchema.index({ tenantId: 1, status: 1 });
IvaSalesBookSchema.index({ tenantId: 1, isElectronic: 1 });
IvaSalesBookSchema.index({ tenantId: 1, originalCurrency: 1 });
