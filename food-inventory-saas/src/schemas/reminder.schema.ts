import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ReminderDocument = Reminder & Document;

export enum ReminderType {
  NEXT_STEP_DUE = "next_step_due",
  AGING_ALERT = "aging_alert",
  MQL_RESPONSE = "mql_response",
  CALENDAR_EVENT = "calendar_event",
  CUSTOM = "custom",
}

export enum ReminderChannel {
  EMAIL = "email",
  WHATSAPP = "whatsapp",
  IN_APP = "in_app",
}

@Schema({ timestamps: true })
export class Reminder {
  @Prop({
    type: String,
    enum: Object.values(ReminderType),
    required: true,
  })
  type: ReminderType;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String })
  message?: string;

  @Prop({ type: Date, required: true })
  scheduledFor: Date;

  @Prop({
    type: [String],
    enum: Object.values(ReminderChannel),
    default: ["in_app"],
  })
  channels: ReminderChannel[];

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({
    type: String,
    enum: ["pending", "sent", "failed", "cancelled"],
    default: "pending",
  })
  status: string;

  @Prop({ type: String })
  error?: string;

  // Referencias
  @Prop({ type: Types.ObjectId, ref: "Opportunity" })
  opportunityId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Customer" })
  customerId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Activity" })
  activityId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  userId?: Types.ObjectId; // Usuario que debe recibir el recordatorio

  // Configuración de anticipación (minutos antes del evento)
  @Prop({ type: Number, default: 60 })
  advanceMinutes: number;

  // Metadata adicional
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);

// Índices
ReminderSchema.index({ tenantId: 1, status: 1, scheduledFor: 1 });
ReminderSchema.index({ tenantId: 1, opportunityId: 1 });
ReminderSchema.index({ tenantId: 1, userId: 1, status: 1 });
ReminderSchema.index({ tenantId: 1, type: 1, status: 1 });
