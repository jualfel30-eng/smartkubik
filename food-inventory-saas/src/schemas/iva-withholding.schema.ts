import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IvaWithholdingDocument = IvaWithholding & Document;

/**
 * IVA Withholding Schema - Retenciones de IVA
 * Cumple con normativa SENIAT para retenciones de IVA (75% o 100%)
 */
@Schema({ timestamps: true })
export class IvaWithholding {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant', index: true })
  tenantId: Types.ObjectId;

  // Numeración del comprobante
  @Prop({ required: true, unique: true })
  certificateNumber: string; // Correlativo: RET-IVA-000001

  @Prop({ required: true, type: Date, index: true })
  withholdingDate: Date;

  // Información del proveedor (contribuyente especial)
  @Prop({ required: true, type: Types.ObjectId, ref: 'Supplier' })
  supplierId: Types.ObjectId;

  @Prop({ required: true })
  supplierRif: string; // J-12345678-9 o V-12345678

  @Prop({ required: true })
  supplierName: string;

  @Prop()
  supplierAddress: string;

  // Referencia a la compra/factura
  @Prop({ type: Types.ObjectId, ref: 'Purchase' })
  purchaseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Payable' })
  payableId: Types.ObjectId;

  @Prop({ required: true })
  invoiceNumber: string; // Número de factura del proveedor

  @Prop({ required: true })
  invoiceControlNumber: string; // Número de control de la factura

  @Prop({ type: Date })
  invoiceDate: Date;

  // Montos
  @Prop({ required: true })
  baseAmount: number; // Base imponible (subtotal sin IVA)

  @Prop({ required: true })
  ivaAmount: number; // IVA total de la factura (16%)

  @Prop({ required: true, enum: [75, 100] })
  withholdingPercentage: number; // 75% o 100%

  @Prop({ required: true })
  withholdingAmount: number; // Monto retenido = ivaAmount * (withholdingPercentage / 100)

  // Tipo de operación según SENIAT
  @Prop({
    required: true,
    enum: [
      'compra_bienes',
      'compra_servicios',
      'importacion',
      'arrendamiento',
      'honorarios_profesionales',
    ],
  })
  operationType: string;

  // Asiento contable generado
  @Prop({ type: Types.ObjectId, ref: 'JournalEntry' })
  journalEntryId: Types.ObjectId;

  // Estado
  @Prop({ default: 'draft', enum: ['draft', 'posted', 'annulled'], index: true })
  status: string;

  @Prop()
  observations: string;

  @Prop()
  annulmentReason: string; // Razón de anulación si status='annulled'

  @Prop({ type: Date })
  annulmentDate: Date;

  // Para exportación a ARC (Archivo de Retenciones y Comprobantes)
  @Prop({ default: false })
  exportedToARC: boolean;

  @Prop({ type: Date })
  arcExportDate: Date;

  // Auditoría
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;
}

export const IvaWithholdingSchema = SchemaFactory.createForClass(IvaWithholding);

// Índices
IvaWithholdingSchema.index({ tenantId: 1, certificateNumber: 1 }, { unique: true });
IvaWithholdingSchema.index({ tenantId: 1, withholdingDate: 1 });
IvaWithholdingSchema.index({ tenantId: 1, status: 1 });
IvaWithholdingSchema.index({ tenantId: 1, supplierId: 1 });
IvaWithholdingSchema.index({ invoiceNumber: 1 });
