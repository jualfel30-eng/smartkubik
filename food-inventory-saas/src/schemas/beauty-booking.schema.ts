import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Schema para reservas de servicios de belleza
 * NO requiere cuenta de usuario - solo nombre + teléfono
 */
@Schema({ timestamps: true })
export class BeautyBooking {
  // Multi-tenancy
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  // Número único de reserva
  @Prop({ type: String, unique: true, required: true, index: true })
  bookingNumber: string; // "BBK-00001", "BBK-00002"

  // Cliente (SIN cuenta - solo datos básicos)
  @Prop({
    type: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true }, // con código país: +58...
      email: { type: String, trim: true },
      whatsapp: { type: String, trim: true }
    },
    required: true,
    _id: false
  })
  client: {
    name: string;
    phone: string;
    email?: string;
    whatsapp?: string;
  };

  // Profesional (puede ser null si "sin preferencia")
  @Prop({ type: Types.ObjectId, ref: 'Professional' })
  professional?: Types.ObjectId;

  @Prop({ type: String, trim: true })
  professionalName?: string; // Desnormalizado para queries rápidas

  // Servicios reservados (array porque puede ser múltiple)
  @Prop({
    type: [{
      service: { type: Types.ObjectId, ref: 'BeautyService', required: true },
      name: { type: String, required: true }, // Desnormalizado
      duration: { type: Number, required: true },
      price: { type: Number, required: true },
      addons: [{
        name: String,
        price: Number,
        duration: Number
      }]
    }],
    required: true
  })
  services: Array<{
    service: Types.ObjectId;
    name: string;
    duration: number;
    price: number;
    addons?: Array<{
      name: string;
      price: number;
      duration?: number;
    }>;
  }>;

  // Fecha y hora
  @Prop({ type: Date, required: true, index: true })
  date: Date; // Solo fecha (sin hora específica)

  @Prop({ type: String, required: true })
  startTime: string; // "10:30"

  @Prop({ type: String, required: true })
  endTime: string; // "11:30" (calculado automáticamente)

  // Totales
  @Prop({ type: Number, required: true, min: 0 })
  totalPrice: number;

  @Prop({ type: Number, required: true, min: 5 })
  totalDuration: number; // minutos totales

  // Estado de la reserva
  @Prop({
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
    index: true
  })
  status: string;

  // Estado del pago
  @Prop({
    type: String,
    enum: ['unpaid', 'deposit_paid', 'paid'],
    default: 'unpaid',
    index: true
  })
  paymentStatus: string;

  @Prop({ type: String, trim: true })
  paymentMethod?: string; // "Pago Móvil", "Zelle", "Efectivo USD"

  @Prop({ type: Number, default: 0, min: 0 })
  amountPaid: number;

  // Notas del cliente
  @Prop({ type: String, trim: true })
  notes?: string;

  // Recordatorio enviado (para idempotencia del cron job)
  @Prop({ type: Date })
  reminderSentAt?: Date;

  // Puntos de lealtad redimidos en este pago
  @Prop({ type: Number, default: 0, min: 0 })
  loyaltyPointsRedeemed: number;

  // Notificaciones WhatsApp
  @Prop({
    type: [{
      type: { type: String, enum: ['confirmation', 'reminder', 'cancellation', 'rescheduled'], required: true },
      sentAt: { type: Date, required: true },
      status: { type: String, enum: ['sent', 'delivered', 'read', 'failed'], required: true },
      messageId: String,
      error: String
    }],
    default: []
  })
  whatsappNotifications: Array<{
    type: 'confirmation' | 'reminder' | 'cancellation' | 'rescheduled';
    sentAt: Date;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    messageId?: string;
    error?: string;
  }>;

  // Productos adicionales vendidos en la cita (upsell)
  @Prop({
    type: [{
      name: { type: String },
      price: { type: Number, default: 0 },
      quantity: { type: Number, default: 1 },
      productId: { type: Types.ObjectId, ref: 'Product', required: false },
    }],
    default: [],
  })
  addons: Array<{
    name: string;
    price: number;
    quantity: number;
    productId?: Types.ObjectId;
  }>;

  // Programa de lealtad
  @Prop({ type: Number, default: 0, min: 0 })
  loyaltyPointsAwarded: number;

  // Ubicación (si el tenant tiene múltiples sedes)
  @Prop({ type: Types.ObjectId, ref: 'BusinessLocation' })
  locationId?: Types.ObjectId;

  // Paquete seleccionado (opcional)
  @Prop({ type: Types.ObjectId, ref: 'BeautyPackage' })
  packageId?: Types.ObjectId;

  // Auditoría y tracking
  @Prop({ type: Types.ObjectId, ref: 'User' })
  confirmedBy?: Types.ObjectId;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  cancelledBy?: Types.ObjectId;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: String, trim: true })
  cancellationReason?: string;
}

export type BeautyBookingDocument = BeautyBooking & Document;
export const BeautyBookingSchema = SchemaFactory.createForClass(BeautyBooking);

// Índices críticos para queries de disponibilidad y búsqueda
BeautyBookingSchema.index({ tenantId: 1, date: 1, status: 1 });
BeautyBookingSchema.index({ tenantId: 1, professional: 1, date: 1, startTime: 1 });
BeautyBookingSchema.index({ 'client.phone': 1, tenantId: 1 });
BeautyBookingSchema.index({ bookingNumber: 1 }, { unique: true });
BeautyBookingSchema.index({ tenantId: 1, locationId: 1, date: 1 });
BeautyBookingSchema.index({ tenantId: 1, createdAt: -1 });

// Virtual para nombre completo del profesional (si se necesita populate)
BeautyBookingSchema.virtual('professionalDetails', {
  ref: 'Professional',
  localField: 'professional',
  foreignField: '_id',
  justOne: true
});
