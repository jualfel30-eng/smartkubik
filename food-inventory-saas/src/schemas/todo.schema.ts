import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TodoDocument = Todo & Document;

@Schema({ timestamps: true })
export class Todo {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: Boolean, default: false })
  isCompleted: boolean;

  @Prop({ type: Date, required: false })
  dueDate?: Date;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: String, enum: ['low', 'medium', 'high'], default: 'medium' })
  priority: string;

  @Prop({ type: String, required: false })
  relatedEventId?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);