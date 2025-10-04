import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ServiceDocument = Service & Document;

/**
 * Service Schema - Servicios ofrecidos por el negocio
 *
 * Ejemplos:
 * - Consulta médica general (30 min, $20)
 * - Corte de cabello (45 min, $15)
 * - Masaje relajante (60 min, $50)
 * - Revisión de vehículo (120 min, $80)
 */
@Schema({ timestamps: true })
export class Service {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ required: true, trim: true })
  category: string; // Ej: "Consultas", "Tratamientos", "Cortes", etc.

  @Prop({ type: Number, required: true })
  duration: number; // Duración en minutos

  @Prop({ type: Number, required: true, default: 0 })
  price: number; // Precio del servicio

  @Prop({ type: Number, default: 0 })
  cost: number; // Costo del servicio (opcional, para calcular margen)

  @Prop({ type: String, enum: ['active', 'inactive'], default: 'active' })
  status: string;

  @Prop({ type: String })
  color: string; // Color para visualización en calendario (hex: #FF5733)

  @Prop({ type: Boolean, default: true })
  requiresResource: boolean; // Si requiere asignación de recurso (doctor, sala, etc.)

  @Prop({ type: [String], default: [] })
  allowedResourceTypes: string[]; // Tipos de recursos permitidos: ["doctor", "sala"]

  @Prop({ type: Number, default: 0 })
  bufferTimeBefore: number; // Tiempo de preparación antes (minutos)

  @Prop({ type: Number, default: 0 })
  bufferTimeAfter: number; // Tiempo de limpieza/transición después (minutos)

  @Prop({ type: Number, default: 1 })
  maxSimultaneous: number; // Máximo de servicios simultáneos permitidos

  @Prop({ type: Object })
  metadata: Record<string, any>; // Datos adicionales específicos del negocio
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

// Índices compuestos para búsquedas eficientes
ServiceSchema.index({ tenantId: 1, status: 1 });
ServiceSchema.index({ tenantId: 1, category: 1 });
ServiceSchema.index({ tenantId: 1, name: 'text' });
