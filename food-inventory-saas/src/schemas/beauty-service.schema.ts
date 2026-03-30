import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Schema para servicios de belleza (peluquerías, barberías, salones)
 * NO reutiliza Product porque los servicios no tienen inventario
 */
@Schema({ timestamps: true })
export class BeautyService {
  // Multi-tenancy (REQUERIDO en todos los documentos)
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  // Identificación
  @Prop({ type: String, required: true, trim: true })
  name: string; // "Corte de cabello masculino", "Manicura completa"

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: String, required: true, index: true })
  category: string; // "Cortes", "Barba", "Tratamientos", "Color", "Uñas"

  // Duración y timeline (en minutos)
  @Prop({ type: Number, required: true, min: 5 })
  duration: number; // 30, 45, 60, 90 minutos

  @Prop({ type: Number, default: 10, min: 0 })
  bufferBefore: number; // tiempo de preparación

  @Prop({ type: Number, default: 10, min: 0 })
  bufferAfter: number; // limpieza/transición entre clientes

  // Pricing
  @Prop({
    type: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, enum: ['USD', 'VES', 'COP', 'EUR'], default: 'USD' },
      displayText: { type: String, trim: true } // "Desde $15" o "$15 - $25"
    },
    required: true,
    _id: false
  })
  price: {
    amount: number;
    currency: string;
    displayText?: string;
  };

  @Prop({ type: Number, min: 0 })
  cost?: number; // Costo interno para calcular margen

  @Prop({
    type: {
      mode: { type: String, enum: ['manual', 'markup', 'margin'], default: 'manual' },
      markupPercentage: { type: Number, min: 0 },
      marginPercentage: { type: Number, min: 0, max: 100 },
      autoCalculate: { type: Boolean, default: false }
    },
    _id: false
  })
  pricingStrategy?: {
    mode: 'manual' | 'markup' | 'margin';
    markupPercentage?: number;
    marginPercentage?: number;
    autoCalculate: boolean;
  };

  // Imágenes (Base64 strings - máx 3 por servicio)
  @Prop({ type: [String], default: [] })
  images: string[]; // ["data:image/jpeg;base64,..."]

  // Profesionales que ofrecen este servicio
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Professional' }], default: [] })
  professionals: Types.ObjectId[];

  // Restricciones de booking
  @Prop({ type: Number, default: 2, min: 0 })
  minAdvanceBooking: number; // horas mínimas de anticipación

  @Prop({ type: Number, default: 30 * 24, min: 1 })
  maxAdvanceBooking: number; // horas máximas hacia adelante (default: 30 días)

  // Disponibilidad simultánea
  @Prop({ type: Number, default: 1, min: 1 })
  maxSimultaneous: number; // cuántos clientes en paralelo

  // Complementos (addons)
  @Prop({
    type: [{
      name: { type: String, required: true },
      description: String,
      price: { type: Number, required: true, min: 0 },
      duration: { type: Number, min: 0 },
      isActive: { type: Boolean, default: true }
    }],
    default: []
  })
  addons?: Array<{
    name: string;
    description?: string;
    price: number;
    duration?: number;
    isActive: boolean;
  }>;

  // Depósito para confirmar (opcional)
  @Prop({ type: Boolean, default: false })
  requiresDeposit: boolean;

  @Prop({ type: String, enum: ['fixed', 'percentage'], default: 'fixed' })
  depositType: 'fixed' | 'percentage';

  @Prop({ type: Number, default: 0, min: 0 })
  depositAmount: number;

  // Estado
  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  // Metadata
  @Prop({ type: String, trim: true })
  color?: string; // hex color para calendario visual (#FF5733)

  @Prop({ type: [String], default: [] })
  tags: string[];

  // Auditoría (REQUERIDO según patrón existente)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export type BeautyServiceDocument = BeautyService & Document;
export const BeautyServiceSchema = SchemaFactory.createForClass(BeautyService);

// Índices para optimización de queries multi-tenant
BeautyServiceSchema.index({ tenantId: 1, isActive: 1, sortOrder: 1 });
BeautyServiceSchema.index({ tenantId: 1, category: 1 });
BeautyServiceSchema.index({ tenantId: 1, createdAt: -1 });
