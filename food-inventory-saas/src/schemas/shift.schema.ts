import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ShiftDocument = Shift & Document;

@Schema({ timestamps: true })
export class Shift {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, index: true })
  clockIn: Date;

  @Prop()
  clockOut?: Date;

  @Prop()
  durationInHours?: number;

  @Prop({ type: Object })
  metadata?: {
    ipAddress?: string;
    device?: string;
  };
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);

ShiftSchema.pre('save', function(next) {
  if (this.isModified('clockOut') && this.clockOut) {
    const durationInMs = this.clockOut.getTime() - this.clockIn.getTime();
    this.durationInHours = durationInMs / (1000 * 60 * 60);
  }
  next();
});
