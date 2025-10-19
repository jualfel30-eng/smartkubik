import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type AppointmentDocument = Appointment & Document;

/**
 * Appointment Schema - Citas/Agendamientos
 *
 * Representa una cita entre un cliente y un servicio,
 * opcionalmente asignada a un recurso específico (doctor, sala, etc.)
 */
@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  // Cliente
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Customer",
    required: true,
  })
  customerId: MongooseSchema.Types.ObjectId;

  @Prop({ trim: true })
  customerName: string; // Denormalizado para búsquedas rápidas

  @Prop({ trim: true })
  customerPhone: string; // Denormalizado para contacto rápido

  // Servicio
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Service", required: true })
  serviceId: MongooseSchema.Types.ObjectId;

  @Prop({ trim: true })
  serviceName: string; // Denormalizado

  @Prop({ type: Number })
  serviceDuration: number; // Duración en minutos (denormalizado)

  @Prop({ type: Number })
  servicePrice: number; // Precio al momento de la cita (denormalizado)

  // Recurso (opcional)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Resource" })
  resourceId: MongooseSchema.Types.ObjectId;

  @Prop({ trim: true })
  resourceName: string; // Denormalizado

  // Fechas y horarios
  @Prop({ type: Date, required: true, index: true })
  startTime: Date;

  @Prop({ type: Date, required: true, index: true })
  endTime: Date;

  // Estado de la cita
  @Prop({
    type: String,
    enum: [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
      "no_show",
    ],
    default: "pending",
    index: true,
  })
  status: string;

  // Notas y observaciones
  @Prop({ type: String })
  notes: string; // Notas del cliente o del negocio

  @Prop({ type: String })
  cancellationReason: string; // Razón de cancelación (si aplica)

  // Recordatorios
  @Prop({ type: Boolean, default: false })
  reminderSent: boolean;

  @Prop({ type: Date })
  reminderSentAt: Date;

  // Confirmación
  @Prop({ type: Boolean, default: false })
  confirmed: boolean;

  @Prop({ type: Date })
  confirmedAt: Date;

  @Prop({ type: String })
  confirmedBy: string; // Usuario que confirmó

  // Completado
  @Prop({ type: Date })
  completedAt: Date;

  @Prop({ type: String })
  completedBy: string; // Usuario que marcó como completada

  // Cancelado
  @Prop({ type: Date })
  cancelledAt: Date;

  @Prop({ type: String })
  cancelledBy: string; // Usuario que canceló

  // Orden de venta (si se generó al completar)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Order" })
  orderId: MongooseSchema.Types.ObjectId;

  // Color personalizado (sobrescribe el del servicio)
  @Prop({ type: String })
  color: string;

  // Metadata adicional
  @Prop({ type: Object })
  metadata: Record<string, any>;

  // Información de facturación
  @Prop({ type: Boolean, default: false })
  isPaid: boolean;

  @Prop({
    type: String,
    enum: ["pending", "paid", "partial", "refunded"],
    default: "pending",
  })
  paymentStatus: string;

  @Prop({ type: Number, default: 0 })
  paidAmount: number;

  // Recurrencia (para citas recurrentes - futuro)
  @Prop({ type: Boolean, default: false })
  isRecurring: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Appointment" })
  recurringParentId: MongooseSchema.Types.ObjectId;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// Índices compuestos para consultas eficientes
AppointmentSchema.index({ tenantId: 1, startTime: 1 });
AppointmentSchema.index({ tenantId: 1, status: 1 });
AppointmentSchema.index({ tenantId: 1, customerId: 1 });
AppointmentSchema.index({ tenantId: 1, resourceId: 1, startTime: 1 });
AppointmentSchema.index({ tenantId: 1, serviceId: 1 });
AppointmentSchema.index({ tenantId: 1, startTime: 1, endTime: 1 }); // Para búsqueda de conflictos

// Índice de texto para búsqueda
AppointmentSchema.index({
  customerName: "text",
  serviceName: "text",
  resourceName: "text",
});
