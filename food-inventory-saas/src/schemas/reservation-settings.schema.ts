import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ReservationSettingsDocument = ReservationSettings & Document;

@Schema()
export class ServiceShift {
  @Prop({ type: String, required: true })
  name: string; // 'Almuerzo', 'Cena'

  @Prop({ type: String, required: true })
  start: string; // '12:00'

  @Prop({ type: String, required: true })
  end: string; // '16:00'

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

const ServiceShiftSchema = SchemaFactory.createForClass(ServiceShift);

@Schema()
export class ServiceHours {
  @Prop({ type: Number, required: true, min: 0, max: 6 })
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, etc.

  @Prop({ type: [ServiceShiftSchema], default: [] })
  shifts: ServiceShift[];
}

const ServiceHoursSchema = SchemaFactory.createForClass(ServiceHours);

@Schema({ timestamps: true })
export class ReservationSettings {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, unique: true })
  tenantId: Types.ObjectId;

  // Configuración general
  @Prop({ type: Boolean, default: true })
  acceptReservations: boolean;

  @Prop({ type: Number, default: 30 })
  advanceBookingDays: number; // cuántos días adelante se puede reservar

  @Prop({ type: Number, default: 1 })
  minPartySize: number;

  @Prop({ type: Number, default: 20 })
  maxPartySize: number;

  // Slots
  @Prop({ type: Number, default: 30 })
  slotDuration: number; // 30, 60, 90, 120 minutos

  @Prop({ type: Number, default: 15 })
  bufferTime: number; // tiempo entre reservas (15 min)

  // Límites
  @Prop({ type: Number, default: 10 })
  maxReservationsPerSlot: number;

  @Prop({ type: Number, default: 100 })
  maxReservationsPerDay: number;

  // Horarios de servicio
  @Prop({ type: [ServiceHoursSchema], default: [] })
  serviceHours: ServiceHours[];

  // Comunicaciones
  @Prop({ type: Boolean, default: true })
  sendConfirmationEmail: boolean;

  @Prop({ type: Boolean, default: false })
  sendConfirmationSMS: boolean;

  @Prop({ type: Boolean, default: true })
  sendReminder: boolean;

  @Prop({ type: Number, default: 24 })
  reminderHoursBefore: number; // 24 horas antes

  // Política de cancelación
  @Prop({ type: String, default: "" })
  cancellationPolicy: string;

  @Prop({ type: Boolean, default: true })
  allowGuestCancellation: boolean;

  @Prop({ type: Number, default: 2 })
  cancellationHoursBefore: number; // Cancelar hasta 2 horas antes

  // Depósito
  @Prop({ type: Boolean, default: false })
  requireDeposit: boolean;

  @Prop({ type: Number, default: 0 })
  depositAmount: number;

  @Prop({ type: Number, default: 0 })
  depositPercentage: number; // % del total estimado

  // Auto-confirmación
  @Prop({ type: Boolean, default: true })
  autoConfirm: boolean; // Auto-confirmar reservas del website

  // No-show settings
  @Prop({ type: Number, default: 30 })
  noShowGracePeriodMinutes: number; // Marcar no-show después de X minutos
}

export const ReservationSettingsSchema =
  SchemaFactory.createForClass(ReservationSettings);

// Índice
ReservationSettingsSchema.index({ tenantId: 1 });
