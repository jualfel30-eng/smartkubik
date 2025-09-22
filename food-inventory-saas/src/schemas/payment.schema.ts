import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payable', required: true })
  payableId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  paymentMethod: string; // e.g., 'cash', 'bank_transfer', 'credit_card'

  @Prop()
  referenceNumber?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
