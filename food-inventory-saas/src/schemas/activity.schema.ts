import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ActivityDocument = Activity & Document;

export enum ActivityType {
  EMAIL = "email",
  CALL = "call",
  MEETING = "meeting",
  WHATSAPP = "whatsapp",
  NOTE = "note",
  TASK = "task",
  CALENDAR_EVENT = "calendar_event",
}

export enum ActivityDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
}

@Schema({ timestamps: true })
export class Activity {
  @Prop({
    type: String,
    enum: Object.values(ActivityType),
    required: true,
  })
  type: ActivityType;

  @Prop({
    type: String,
    enum: Object.values(ActivityDirection),
  })
  direction?: ActivityDirection;

  @Prop({ type: String, required: true })
  subject: string;

  @Prop({ type: String })
  body?: string;

  @Prop({ type: Date })
  scheduledAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Boolean, default: false })
  completed: boolean;

  // Referencias
  @Prop({ type: Types.ObjectId, ref: "Opportunity" })
  opportunityId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  ownerId?: Types.ObjectId;

  // Threading para email/WhatsApp
  @Prop({ type: String })
  messageId?: string;

  @Prop({ type: String })
  threadId?: string;

  // Metadata de canal
  @Prop({ type: String })
  channel?: string; // email, whatsapp, calendar

  @Prop({ type: String })
  externalId?: string; // ID externo del mensaje/evento

  @Prop({ type: String })
  externalCalendar?: string; // google, microsoft, apple

  @Prop({ type: String })
  externalEventId?: string; // ID del evento en calendario externo

  // Participantes
  @Prop({ type: [String], default: [] })
  participants?: string[]; // emails o teléfonos

  // Metadata adicional
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  // Tenant
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

// Índices para búsquedas eficientes
ActivitySchema.index({ tenantId: 1, opportunityId: 1 });
ActivitySchema.index({ tenantId: 1, customerId: 1 });
ActivitySchema.index({ tenantId: 1, ownerId: 1 });
ActivitySchema.index({ tenantId: 1, type: 1 });
ActivitySchema.index({ tenantId: 1, threadId: 1 });
ActivitySchema.index({ tenantId: 1, messageId: 1 });
ActivitySchema.index({ tenantId: 1, scheduledAt: 1 });
ActivitySchema.index({ tenantId: 1, completed: 1, scheduledAt: 1 }); // Para recordatorios
