import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true })
  start: Date;

  @Prop()
  end?: Date;

  @Prop({ default: false })
  allDay: boolean;

  @Prop({ trim: true })
  color?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;
}

export const EventSchema = SchemaFactory.createForClass(Event);

EventSchema.index({ tenantId: 1, start: 1 });
