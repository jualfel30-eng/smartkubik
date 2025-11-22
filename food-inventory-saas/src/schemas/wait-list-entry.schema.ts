import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type WaitListEntryDocument = WaitListEntry & Document;

export type WaitListStatus =
  | "waiting"
  | "notified"
  | "seated"
  | "cancelled"
  | "no-show";

@Schema({ timestamps: true })
export class WaitListEntry extends Document {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true })
  customerName: string;

  @Prop({ type: String, required: true })
  phoneNumber: string; // Para notificaciones SMS/WhatsApp

  @Prop({ type: String })
  email?: string;

  @Prop({ type: Number, required: true, min: 1 })
  partySize: number; // Número de personas

  @Prop({ type: Date, default: () => new Date(), index: true })
  arrivalTime: Date; // Hora de llegada al restaurante

  @Prop({ type: Number, default: 0 })
  estimatedWaitTime: number; // Tiempo estimado de espera en minutos

  @Prop({ type: Number, required: true })
  position: number; // Posición en la lista de espera

  @Prop({
    type: String,
    enum: ["waiting", "notified", "seated", "cancelled", "no-show"],
    default: "waiting",
    index: true,
  })
  status: WaitListStatus;

  @Prop({ type: Date })
  notifiedAt?: Date; // Cuándo se notificó al cliente

  @Prop({ type: Date })
  seatedAt?: Date; // Cuándo fueron sentados

  @Prop({ type: Types.ObjectId, ref: "Table" })
  tableId?: Types.ObjectId; // Mesa asignada

  @Prop({ type: String })
  notes?: string; // Notas especiales

  @Prop({
    type: {
      sentAt: Date,
      method: String, // 'sms', 'whatsapp', 'email'
      delivered: Boolean,
    },
  })
  notification?: {
    sentAt: Date;
    method: string;
    delivered: boolean;
  };

  @Prop({ type: Number, default: 0 })
  actualWaitTime?: number; // Tiempo real de espera (en minutos)

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const WaitListEntrySchema = SchemaFactory.createForClass(WaitListEntry);

// Índices compuestos
WaitListEntrySchema.index({ tenantId: 1, status: 1, position: 1 });
WaitListEntrySchema.index({ tenantId: 1, arrivalTime: -1 });
WaitListEntrySchema.index({ tenantId: 1, phoneNumber: 1 });
