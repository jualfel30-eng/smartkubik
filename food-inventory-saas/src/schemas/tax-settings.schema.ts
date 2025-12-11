import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaxSettingsDocument = TaxSettings & Document;

/**
 * Tax Settings Schema - Configuración de impuestos por tenant
 * Permite configurar tasas de IVA, ISLR, IGTF y otros impuestos venezolanos
 */
@Schema({ timestamps: true })
export class TaxSettings {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant', index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, enum: ['IVA', 'ISLR', 'IGTF', 'CUSTOMS', 'OTHER'] })
  taxType: string; // Tipo de impuesto

  @Prop({ required: true })
  name: string; // Ej: "IVA General", "IVA Reducido", "ISLR Honorarios Profesionales"

  @Prop({ required: true })
  code: string; // Ej: "IVA-16", "ISLR-HP-5"

  @Prop({ required: true, min: 0, max: 100 })
  rate: number; // Tasa en porcentaje (16 para IVA 16%)

  @Prop()
  description: string;

  // Cuenta contable para registrar este impuesto
  @Prop({ required: true })
  accountCode: string; // Ej: "2102" para IVA por Pagar

  @Prop()
  accountName: string; // Nombre de la cuenta (desnormalizado para queries rápidas)

  // Aplicabilidad
  @Prop({ default: 'all', enum: ['all', 'products', 'services', 'payroll', 'custom'] })
  applicableTo: string;

  @Prop({ type: [String] })
  applicableCategories: string[]; // IDs de categorías si applicableTo='custom'

  // Para retenciones
  @Prop({ default: false })
  isWithholding: boolean; // true para retenciones de IVA/ISLR

  @Prop({ min: 0, max: 100 })
  withholdingRate: number; // Ej: 75 para retención del 75% del IVA

  @Prop()
  withholdingAccountCode: string; // Cuenta de retención (ej: "2104" para IVA Retenido por Pagar)

  // Configuración específica para Venezuela
  @Prop({ default: false })
  isDefault: boolean; // true para la tasa por defecto (ej: IVA 16% general)

  @Prop({ default: false })
  exemptFromIGTF: boolean; // true si transacciones con este impuesto están exentas de IGTF

  // Estado
  @Prop({ default: 'active', enum: ['active', 'inactive', 'archived'] })
  status: string;

  @Prop({ type: Date })
  effectiveDate: Date; // Fecha desde la cual aplica esta tasa

  @Prop({ type: Date })
  expiryDate: Date; // Fecha hasta la cual aplica (null = indefinido)

  // Auditoría
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;
}

export const TaxSettingsSchema = SchemaFactory.createForClass(TaxSettings);

// Índices
TaxSettingsSchema.index({ tenantId: 1, code: 1 }, { unique: true });
TaxSettingsSchema.index({ tenantId: 1, taxType: 1, isDefault: 1 });
TaxSettingsSchema.index({ tenantId: 1, status: 1 });
