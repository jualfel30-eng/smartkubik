import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Schema para profesionales de belleza (barberos, estilistas, manicuristas, etc.)
 */
@Schema({ timestamps: true })
export class Professional {
  // Multi-tenancy
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  // Información personal
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true })
  role?: string; // "Master Barber", "Estilista Senior", "Colorista", "Nail Artist"

  @Prop({ type: String, trim: true })
  bio?: string;

  // Avatar (Base64 string)
  @Prop({ type: String })
  avatar?: string; // "data:image/jpeg;base64,..."

  // Especialidades
  @Prop({ type: [String], default: [] })
  specialties: string[]; // ["Cortes modernos", "Fade", "Barba", "Diseños"]

  // Redes sociales
  @Prop({ type: String, trim: true })
  instagram?: string; // username o URL completa

  // Horario de trabajo semanal
  @Prop({
    type: [{
      day: { type: Number, required: true, min: 0, max: 6 }, // 0=domingo, 6=sábado
      start: { type: String, required: true }, // "09:00"
      end: { type: String, required: true }, // "18:00"
      breakStart: String, // "12:00" (opcional)
      breakEnd: String, // "13:00" (opcional)
      isWorking: { type: Boolean, default: true }
    }],
    default: []
  })
  schedule: Array<{
    day: number;
    start: string;
    end: string;
    breakStart?: string;
    breakEnd?: string;
    isWorking: boolean;
  }>;

  // Ubicación (si el tenant tiene múltiples sedes/BusinessLocations)
  @Prop({ type: Types.ObjectId, ref: 'BusinessLocation' })
  locationId?: Types.ObjectId;

  // Estado
  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  // Auditoría
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export type ProfessionalDocument = Professional & Document;
export const ProfessionalSchema = SchemaFactory.createForClass(Professional);

// Índices
ProfessionalSchema.index({ tenantId: 1, isActive: 1, sortOrder: 1 });
ProfessionalSchema.index({ tenantId: 1, locationId: 1 });
ProfessionalSchema.index({ tenantId: 1, createdAt: -1 });

// Validación de horarios (formato HH:MM)
ProfessionalSchema.path('schedule').validate(function(schedule: any[]) {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

  for (const slot of schedule) {
    if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
      return false;
    }

    // Validar que end > start
    const [startH, startM] = slot.start.split(':').map(Number);
    const [endH, endM] = slot.end.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (endMins <= startMins) {
      return false;
    }

    // Validar break si existe
    if (slot.breakStart && slot.breakEnd) {
      if (!timeRegex.test(slot.breakStart) || !timeRegex.test(slot.breakEnd)) {
        return false;
      }
    }
  }

  return true;
}, 'Invalid time format or schedule configuration');
