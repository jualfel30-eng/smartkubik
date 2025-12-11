import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IvaDeclarationDocument = IvaDeclaration & Document;

/**
 * Declaración de IVA (Forma 30) - SENIAT Venezuela
 * Declaración mensual del Impuesto al Valor Agregado
 */
@Schema({ timestamps: true })
export class IvaDeclaration {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant', index: true })
  tenantId: Types.ObjectId;

  // ============ PERÍODO ============
  @Prop({ required: true, type: Number, min: 1, max: 12 })
  month: number; // Mes fiscal (1-12)

  @Prop({ required: true, type: Number })
  year: number; // Año fiscal

  @Prop({ required: true, type: String, unique: true })
  declarationNumber: string; // Número de declaración (DEC-IVA-MMYYYY-XXXXXX)

  // ============ DÉBITO FISCAL (IVA de Ventas) ============
  @Prop({ type: Number, default: 0 })
  salesBaseAmount: number; // Base imponible ventas

  @Prop({ type: Number, default: 0 })
  salesIvaAmount: number; // IVA cobrado (débito fiscal)

  @Prop({ type: Number, default: 0 })
  salesExemptAmount: number; // Ventas exentas

  @Prop({ type: Number, default: 0 })
  salesExportAmount: number; // Exportaciones (0% IVA)

  @Prop({ type: Number, default: 0 })
  totalDebitFiscal: number; // Total débito fiscal

  // ============ CRÉDITO FISCAL (IVA de Compras) ============
  @Prop({ type: Number, default: 0 })
  purchasesBaseAmount: number; // Base imponible compras

  @Prop({ type: Number, default: 0 })
  purchasesIvaAmount: number; // IVA pagado (crédito fiscal)

  @Prop({ type: Number, default: 0 })
  purchasesImportAmount: number; // Importaciones

  @Prop({ type: Number, default: 0 })
  totalCreditFiscal: number; // Total crédito fiscal

  // ============ RETENCIONES ============
  @Prop({ type: Number, default: 0 })
  ivaWithheldOnSales: number; // IVA retenido por clientes (crédito)

  @Prop({ type: Number, default: 0 })
  ivaWithheldOnPurchases: number; // IVA retenido a proveedores (débito)

  // ============ CÁLCULO FINAL ============
  @Prop({ type: Number, default: 0 })
  previousCreditBalance: number; // Excedente período anterior

  @Prop({ type: Number, default: 0 })
  totalCreditToApply: number; // Crédito fiscal + retenciones + excedente anterior

  @Prop({ type: Number, default: 0 })
  ivaToPay: number; // IVA a pagar (si débito > crédito)

  @Prop({ type: Number, default: 0 })
  creditBalance: number; // Excedente (si crédito > débito)

  // ============ AJUSTES Y OTROS ============
  @Prop({ type: Number, default: 0 })
  adjustments: number; // Ajustes positivos o negativos

  @Prop({ type: String })
  adjustmentReason: string; // Razón del ajuste

  @Prop({ type: Number, default: 0 })
  penalties: number; // Multas o recargos

  @Prop({ type: Number, default: 0 })
  interests: number; // Intereses moratorios

  @Prop({ type: Number, default: 0 })
  totalToPay: number; // Total a pagar (IVA + multas + intereses)

  // ============ DETALLES POR ALÍCUOTA ============
  @Prop({
    type: [
      {
        rate: { type: Number, required: true }, // Alícuota (0, 8, 16)
        salesBase: { type: Number, default: 0 },
        salesIva: { type: Number, default: 0 },
        purchasesBase: { type: Number, default: 0 },
        purchasesIva: { type: Number, default: 0 },
      },
    ],
  })
  rateBreakdown: {
    rate: number;
    salesBase: number;
    salesIva: number;
    purchasesBase: number;
    purchasesIva: number;
  }[];

  // ============ REFERENCIAS ============
  @Prop({ type: Date })
  dueDate: Date; // Fecha límite de presentación

  @Prop({ type: Date })
  filingDate: Date; // Fecha de presentación

  @Prop({ type: Date })
  paymentDate: Date; // Fecha de pago

  @Prop({ type: String })
  paymentReference: string; // Referencia de pago

  // ============ ESTADO ============
  @Prop({
    type: String,
    enum: ['draft', 'calculated', 'filed', 'paid', 'rectified'],
    default: 'draft',
    index: true,
  })
  status: string;

  // ============ VALIDACIÓN Y EXPORTACIÓN ============
  @Prop({ type: Boolean, default: false })
  validated: boolean; // Libros validados

  @Prop({ type: Array, default: [] })
  validationErrors: string[]; // Errores encontrados

  @Prop({ type: Boolean, default: false })
  exportedToSENIAT: boolean; // Exportada/presentada a SENIAT

  @Prop({ type: String })
  seniatConfirmationNumber: string; // Número de confirmación SENIAT

  @Prop({ type: String })
  xmlContent: string; // XML generado para SENIAT

  // ============ INFORMACIÓN ADICIONAL ============
  @Prop({ type: Number, default: 0 })
  totalSalesTransactions: number; // Total operaciones de venta

  @Prop({ type: Number, default: 0 })
  totalPurchasesTransactions: number; // Total operaciones de compra

  @Prop({ type: Number, default: 0 })
  electronicInvoices: number; // Facturas electrónicas emitidas

  @Prop({ type: Number, default: 0 })
  physicalInvoices: number; // Facturas físicas emitidas

  @Prop({ type: String })
  notes: string; // Notas adicionales

  // ============ AUDITORÍA ============
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  filedBy: Types.ObjectId; // Usuario que presentó la declaración
}

export const IvaDeclarationSchema = SchemaFactory.createForClass(IvaDeclaration);

// Índices para optimizar consultas
IvaDeclarationSchema.index({ tenantId: 1, month: 1, year: 1 }, { unique: true });
IvaDeclarationSchema.index({ tenantId: 1, status: 1 });
IvaDeclarationSchema.index({ tenantId: 1, createdAt: -1 });
IvaDeclarationSchema.index({ declarationNumber: 1 }, { unique: true });
