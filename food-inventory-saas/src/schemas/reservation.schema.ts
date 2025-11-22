import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ReservationDocument = Reservation & Document;

@Schema({ timestamps: true })
export class Reservation {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  reservationNumber: string; // RES-2025-001

  // Cliente
  @Prop({ type: Types.ObjectId, ref: "Customer" })
  customerId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  guestName: string;

  @Prop({ type: String, required: true })
  guestPhone: string;

  @Prop({ type: String })
  guestEmail?: string;

  // Reserva
  @Prop({ type: Date, required: true, index: true })
  date: Date;

  @Prop({ type: String, required: true })
  time: string; // '19:30'

  @Prop({ type: Number, required: true, min: 1 })
  partySize: number;

  @Prop({ type: Number, default: 120 })
  duration: number; // minutos estimados (default 2 horas)

  // Mesa asignada
  @Prop({ type: Types.ObjectId, ref: "Table" })
  tableId?: Types.ObjectId;

  @Prop({ type: String })
  tableNumber?: string;

  @Prop({ type: String })
  section?: string;

  // Status
  @Prop({
    type: String,
    enum: [
      "pending",
      "confirmed",
      "cancelled",
      "seated",
      "completed",
      "no-show",
    ],
    default: "pending",
    index: true,
  })
  status: string;

  // Preferencias
  @Prop({ type: String })
  specialRequests?: string; // 'Ventana', 'Cumpleaños', 'Silla de bebé'

  @Prop({
    type: String,
    enum: ["birthday", "anniversary", "business", "casual", "other"],
  })
  occasion?: string;

  // Comunicación
  @Prop({ type: String, enum: ["email", "sms", "phone", "whatsapp"] })
  confirmationMethod?: string;

  @Prop({ type: Date })
  confirmationSentAt?: Date;

  @Prop({ type: Date })
  reminderSentAt?: Date;

  // Metadata
  @Prop({
    type: String,
    enum: ["website", "phone", "walk-in", "app"],
    default: "phone",
  })
  source: string;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  // Auditoría
  @Prop({ type: Date })
  seatedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: String })
  cancelReason?: string;

  @Prop({ type: Types.ObjectId, ref: "Order" })
  orderId?: Types.ObjectId; // Si se creó una orden desde la reserva
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);

// Índices compuestos
ReservationSchema.index({ tenantId: 1, date: 1, status: 1 });
ReservationSchema.index({ tenantId: 1, guestPhone: 1 });
ReservationSchema.index({ tenantId: 1, reservationNumber: 1 });
ReservationSchema.index({ tenantId: 1, customerId: 1 });

// Generar número de reservación automáticamente
ReservationSchema.pre("save", async function (next) {
  if (!this.reservationNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const model = this.constructor as any;
    const count = await model.countDocuments({
      tenantId: this.tenantId,
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1),
      },
    });
    this.reservationNumber = `RES-${year}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});
