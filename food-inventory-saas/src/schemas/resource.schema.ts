import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ResourceDocument = Resource & Document;

/**
 * Resource Schema - Recursos del negocio (personas, equipos, salas)
 *
 * Ejemplos:
 * - Dr. Juan Pérez (tipo: doctor, especialidad: general)
 * - Sala 1 (tipo: sala, capacidad: 1)
 * - Estilista María (tipo: empleado, servicios: corte, tinte)
 * - Grúa 01 (tipo: equipo, servicios: remolque)
 */
@Schema({ timestamps: true })
export class Resource {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    required: true,
    enum: ['person', 'room', 'equipment', 'vehicle', 'other'],
    default: 'person',
  })
  type: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ trim: true })
  email: string;

  @Prop({ trim: true })
  phone: string;

  @Prop({ type: String, enum: ['active', 'inactive', 'on_vacation'], default: 'active' })
  status: string;

  @Prop({ type: String })
  color: string; // Color para visualización en calendario

  // Horario de disponibilidad
  @Prop({
    type: Object,
    default: {
      monday: { available: true, start: '09:00', end: '18:00' },
      tuesday: { available: true, start: '09:00', end: '18:00' },
      wednesday: { available: true, start: '09:00', end: '18:00' },
      thursday: { available: true, start: '09:00', end: '18:00' },
      friday: { available: true, start: '09:00', end: '18:00' },
      saturday: { available: false, start: '09:00', end: '13:00' },
      sunday: { available: false, start: '09:00', end: '13:00' },
    },
  })
  schedule: {
    monday: { available: boolean; start: string; end: string };
    tuesday: { available: boolean; start: string; end: string };
    wednesday: { available: boolean; start: string; end: string };
    thursday: { available: boolean; start: string; end: string };
    friday: { available: boolean; start: string; end: string };
    saturday: { available: boolean; start: string; end: string };
    sunday: { available: boolean; start: string; end: string };
  };

  // Días no disponibles (vacaciones, días libres)
  @Prop({
    type: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        reason: { type: String },
      },
    ],
    default: [],
  })
  unavailableDates: Array<{
    startDate: Date;
    endDate: Date;
    reason?: string;
  }>;

  // Servicios que puede realizar este recurso
  @Prop({ type: [String], default: [] })
  allowedServiceIds: string[]; // IDs de servicios que puede realizar

  @Prop({ type: [String], default: [] })
  specializations: string[]; // Ej: ["cardiología", "pediatría"] o ["corte", "tinte"]

  @Prop({ type: Number, default: 1 })
  capacity: number; // Capacidad (para salas o equipos que pueden atender múltiples personas)

  @Prop({ type: Object })
  metadata: Record<string, any>; // Información adicional (licencias, certificaciones, etc.)
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);

// Índices compuestos
ResourceSchema.index({ tenantId: 1, status: 1 });
ResourceSchema.index({ tenantId: 1, type: 1 });
ResourceSchema.index({ tenantId: 1, name: 'text' });
