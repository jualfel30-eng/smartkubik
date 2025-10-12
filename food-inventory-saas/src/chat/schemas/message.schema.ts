import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type MessageDocument = Message & Document;

export enum SenderType {
  USER = 'user',
  CUSTOMER = 'customer',
}

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: SenderType })
  sender: SenderType;

  @Prop({ required: true })
  content: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
