import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { PayrollCalendar } from "./payroll-calendar.schema";
import { Calendar } from "./calendar.schema";

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {
  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: Date, required: true })
  start: Date;

  @Prop({ type: Date })
  end?: Date;

  @Prop({ type: Boolean, default: false })
  allDay: boolean;

  @Prop({ type: String, trim: true })
  color?: string;

  @Prop({
    type: String,
    enum: ["manual", "purchase", "payment", "inventory", "payroll", "opportunity", "meeting"],
    default: "manual",
  })
  type: string;

  /**
   * Calendario al que pertenece este evento
   * Si no se especifica, se asigna al calendario por defecto del tenant
   */
  @Prop({ type: Types.ObjectId, ref: Calendar.name })
  calendarId?: Types.ObjectId;

  @Prop({ type: String })
  relatedPurchaseId?: string;

  @Prop({ type: String })
  relatedPaymentId?: string;

  @Prop({ type: String })
  relatedInventoryId?: string;

  @Prop({ type: Types.ObjectId, ref: PayrollCalendar.name })
  relatedPayrollCalendarId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Opportunity" })
  relatedOpportunityId?: Types.ObjectId;

  /**
   * Sincronización con Google Calendar
   */
  @Prop({
    type: Object,
    default: null,
  })
  googleSync?: {
    eventId: string; // ID del evento en Google Calendar
    calendarId: string; // ID del calendario de Google donde está el evento
    lastSyncAt?: Date;
    syncStatus?: "synced" | "pending" | "error";
    errorMessage?: string;
  };

  /**
   * Asistentes al evento
   */
  @Prop({ type: [Types.ObjectId], ref: "User", default: [] })
  attendees?: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

export const EventSchema = SchemaFactory.createForClass(Event);

EventSchema.index({ tenantId: 1, start: 1 });
EventSchema.index({ tenantId: 1, calendarId: 1 });
EventSchema.index({ "googleSync.eventId": 1 });
