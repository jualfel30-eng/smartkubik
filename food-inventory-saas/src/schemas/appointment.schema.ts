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

  @Prop({ trim: true, lowercase: true })
  customerEmail?: string; // Email del huésped para búsquedas públicas

  // Servicio
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Service", required: true })
  serviceId: MongooseSchema.Types.ObjectId;

  @Prop({ trim: true })
  serviceName: string; // Denormalizado

  @Prop({ type: Number })
  serviceDuration: number; // Duración en minutos (denormalizado)

  @Prop({ type: Number })
  servicePrice: number; // Precio al momento de la cita (denormalizado)

  // Ubicación (opcional)
  @Prop({ type: String, index: true })
  locationId?: string;

  @Prop({ type: String, trim: true })
  locationName?: string;

  @Prop({ type: Number, default: 1 })
  capacity: number;

  @Prop({
    type: [
      {
        name: { type: String, required: true, trim: true },
        email: { type: String, trim: true },
        phone: { type: String, trim: true },
        role: { type: String, trim: true },
      },
    ],
    default: [],
  })
  participants: Array<{
    name: string;
    email?: string;
    phone?: string;
    role?: string;
  }>;

  // Recurso (opcional)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Resource" })
  resourceId: MongooseSchema.Types.ObjectId;

  @Prop({ trim: true })
  resourceName: string; // Denormalizado

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    ref: "Resource",
    default: [],
  })
  additionalResourceIds: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  resourcesInvolved: string[];

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

  @Prop({ type: String })
  seriesId?: string;

  @Prop({ type: Boolean, default: false })
  isSeriesMaster: boolean;

  @Prop({ type: Number, default: 0 })
  seriesOrder: number;

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

  // Capacidad utilizada (para reservas grupales o recursos con cupo)
  @Prop({ type: Number, default: 1, min: 0 })
  capacityUsed: number;

  @Prop({
    type: [
      {
        name: { type: String, required: true, trim: true },
        price: { type: Number, default: 0 },
        quantity: { type: Number, default: 1 },
      },
    ],
    default: [],
  })
  addons: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;

  @Prop({
    type: String,
    enum: ["backoffice", "storefront", "concierge", "integration"],
    default: "backoffice",
  })
  source: string;

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

  @Prop({
    type: [
      {
        amount: { type: Number, required: true },
        currency: { type: String, default: "VES" },
        status: {
          type: String,
          enum: ["requested", "submitted", "confirmed", "rejected"],
          default: "requested",
        },
        reference: { type: String, trim: true },
        proofUrl: { type: String, trim: true },
        notes: { type: String, trim: true },
        channel: { type: String, trim: true, default: "whatsapp" },
        method: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: String },
        confirmedAt: { type: Date },
        confirmedBy: { type: String },
        confirmedAmount: { type: Number },
        transactionDate: { type: Date },
        decisionNotes: { type: String, trim: true },
        bankAccountId: {
          type: MongooseSchema.Types.ObjectId,
          ref: "BankAccount",
        },
        bankTransactionId: {
          type: MongooseSchema.Types.ObjectId,
          ref: "BankTransaction",
        },
        journalEntryId: {
          type: MongooseSchema.Types.ObjectId,
          ref: "JournalEntry",
        },
        exchangeRate: { type: Number },
        amountUsd: { type: Number },
        amountVes: { type: Number },
        receiptNumber: { type: String, trim: true },
        receiptIssuedAt: { type: Date },
        proof: {
          fileName: { type: String, trim: true },
          mimeType: { type: String, trim: true },
          base64: { type: String },
          uploadedAt: { type: Date },
          uploadedBy: { type: String },
        },
        rejectedAt: { type: Date },
        rejectedBy: { type: String },
      },
    ],
    default: [],
  })
  depositRecords: Array<{
    _id?: any;
    amount: number;
    currency: string;
    status: "requested" | "submitted" | "confirmed" | "rejected";
    reference?: string;
    proofUrl?: string;
    notes?: string;
    channel?: string;
    method?: string;
    createdAt: Date;
    createdBy?: string;
    confirmedAt?: Date;
    confirmedBy?: string;
    confirmedAmount?: number;
    transactionDate?: Date;
    decisionNotes?: string;
    bankAccountId?: any;
    bankTransactionId?: any;
    journalEntryId?: any;
    exchangeRate?: number;
    amountUsd?: number;
    amountVes?: number;
    receiptNumber?: string;
    receiptIssuedAt?: Date;
    proof?: {
      fileName?: string;
      mimeType?: string;
      base64?: string;
      uploadedAt?: Date;
      uploadedBy?: string;
    };
    rejectedAt?: Date;
    rejectedBy?: string;
  }>;

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
AppointmentSchema.index({ tenantId: 1, customerEmail: 1 });
AppointmentSchema.index({ tenantId: 1, resourceId: 1, startTime: 1 });
AppointmentSchema.index({ tenantId: 1, serviceId: 1 });
AppointmentSchema.index({ tenantId: 1, startTime: 1, endTime: 1 }); // Para búsqueda de conflictos
AppointmentSchema.index({ tenantId: 1, locationId: 1, startTime: 1 });
AppointmentSchema.index({ tenantId: 1, capacityUsed: 1 });
AppointmentSchema.index({ tenantId: 1, seriesId: 1 });
AppointmentSchema.index({ tenantId: 1, "depositRecords.status": 1 });

// Índice de texto para búsqueda
AppointmentSchema.index({
  customerName: "text",
  serviceName: "text",
  resourceName: "text",
});
