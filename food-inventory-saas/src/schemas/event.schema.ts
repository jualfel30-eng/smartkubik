import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

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

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

export const EventSchema = SchemaFactory.createForClass(Event);

EventSchema.index({ tenantId: 1, start: 1 });