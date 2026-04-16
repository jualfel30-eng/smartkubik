import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ResourceBlock {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Professional', required: true, index: true })
  professionalId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ required: true })
  startTime: string; // "13:00"

  @Prop({ required: true })
  endTime: string; // "14:00"

  @Prop({ required: true })
  reason: string; // "Almuerzo"|"Mantenimiento"|"Limpieza"|"Personal"|"Otro"

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ default: false })
  isRecurring: boolean;

  @Prop({ type: [Number], default: [] })
  recurringDays: number[]; // 0=Mon...6=Sun

  @Prop({ default: false })
  isDeleted: boolean;
}

export type ResourceBlockDocument = ResourceBlock & Document;
export const ResourceBlockSchema = SchemaFactory.createForClass(ResourceBlock);

ResourceBlockSchema.index({ tenantId: 1, professionalId: 1, date: 1 });
