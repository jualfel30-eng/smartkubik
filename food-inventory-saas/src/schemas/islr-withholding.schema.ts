import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IslrWithholdingDocument = IslrWithholding & Document;

export type IslrOperationType =
  | 'salarios'
  | 'honorarios_profesionales'
  | 'comisiones'
  | 'intereses'
  | 'dividendos'
  | 'arrendamiento'
  | 'regalias'
  | 'servicio_transporte'
  | 'otros_servicios';

export type IslrBeneficiaryType = 'supplier' | 'employee';

export type IslrWithholdingStatus = 'draft' | 'posted' | 'annulled';

@Schema({ timestamps: true })
export class IslrWithholding {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  // Número de certificado
  @Prop({ required: true })
  certificateNumber: string; // RET-ISLR-YYYY-XXXXXX

  // Información del beneficiario (puede ser Supplier o Employee)
  @Prop({
    required: true,
    type: String,
    enum: ['supplier', 'employee'],
  })
  beneficiaryType: IslrBeneficiaryType;

  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  supplierId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  employeeId?: Types.ObjectId;

  @Prop({ required: true })
  beneficiaryRif: string;

  @Prop({ required: true })
  beneficiaryName: string;

  @Prop()
  beneficiaryAddress?: string;

  // Información del comprobante
  @Prop({ required: true })
  documentNumber: string; // Número de factura o recibo

  @Prop({ required: true, type: Date })
  documentDate: Date;

  @Prop({ required: true, type: Date })
  withholdingDate: Date;

  // Montos
  @Prop({ required: true, type: Number })
  baseAmount: number; // Base imponible

  @Prop({ required: true, type: Number, min: 0, max: 34 })
  withholdingPercentage: number; // ISLR varía de 1% a 34%

  @Prop({ required: true, type: Number })
  withholdingAmount: number; // Calculado

  // Tipo de operación ISLR (según SENIAT)
  @Prop({
    required: true,
    type: String,
    enum: [
      'salarios',
      'honorarios_profesionales',
      'comisiones',
      'intereses',
      'dividendos',
      'arrendamiento',
      'regalias',
      'servicio_transporte',
      'otros_servicios',
    ],
  })
  operationType: IslrOperationType;

  // Código de concepto ISLR (según tabla SENIAT)
  @Prop({ required: true })
  conceptCode: string; // Ej: '001' para honorarios

  @Prop()
  conceptDescription?: string;

  // Asiento contable
  @Prop({ type: Types.ObjectId, ref: 'JournalEntry' })
  journalEntryId?: Types.ObjectId;

  // Estado
  @Prop({
    type: String,
    default: 'draft',
    enum: ['draft', 'posted', 'annulled'],
  })
  status: IslrWithholdingStatus;

  // Exportación
  @Prop({ type: Boolean, default: false })
  exportedToARC: boolean;

  @Prop({ type: Date })
  exportDate?: Date;

  // Notas
  @Prop()
  notes?: string;

  // Auditoría
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  // Anulación
  @Prop({ type: Types.ObjectId, ref: 'User' })
  annulledBy?: Types.ObjectId;

  @Prop({ type: Date })
  annulledAt?: Date;

  @Prop()
  annulmentReason?: string;

  // Timestamps (manejados automáticamente por Mongoose)
  createdAt?: Date;
  updatedAt?: Date;
}

export const IslrWithholdingSchema = SchemaFactory.createForClass(IslrWithholding);

// Índices para optimizar consultas
IslrWithholdingSchema.index({ tenantId: 1, certificateNumber: 1 }, { unique: true });
IslrWithholdingSchema.index({ tenantId: 1, withholdingDate: 1 });
IslrWithholdingSchema.index({ tenantId: 1, status: 1 });
IslrWithholdingSchema.index({ tenantId: 1, beneficiaryRif: 1 });
IslrWithholdingSchema.index({ tenantId: 1, operationType: 1 });
IslrWithholdingSchema.index({ tenantId: 1, exportedToARC: 1 });
IslrWithholdingSchema.index({ tenantId: 1, beneficiaryType: 1 });
