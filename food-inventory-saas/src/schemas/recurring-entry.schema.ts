import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type RecurringEntryDocument = RecurringEntry & Document;

@Schema()
class RecurringJournalLine {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'ChartOfAccounts',
    required: true,
  })
  account: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: Number, default: 0 })
  debit: number;

  @Prop({ type: Number, default: 0 })
  credit: number;
}

const RecurringJournalLineSchema =
  SchemaFactory.createForClass(RecurringJournalLine);

@Schema({ timestamps: true })
export class RecurringEntry {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  // Template information
  @Prop({ required: true, trim: true })
  name: string; // e.g., "Depreciación Mensual"

  @Prop({ required: true, trim: true })
  description: string; // Description that will be used in journal entries

  @Prop({ type: [RecurringJournalLineSchema], required: true })
  lines: RecurringJournalLine[];

  // Recurrence settings
  @Prop({
    required: true,
    enum: ['monthly', 'quarterly', 'yearly', 'weekly'],
  })
  frequency: string;

  @Prop({ required: true, type: Date })
  startDate: Date;

  @Prop({ type: Date })
  endDate?: Date; // Optional - if not set, recurs indefinitely

  // Day configuration
  @Prop({ type: Number, min: 1, max: 31 })
  dayOfMonth?: number; // For monthly (e.g., 1 = first day of month)

  @Prop({ type: Number, min: 0, max: 6 })
  dayOfWeek?: number; // For weekly (0 = Sunday, 6 = Saturday)

  // Execution tracking
  @Prop({ type: Date })
  lastExecutionDate?: Date;

  @Prop({ type: Date })
  nextExecutionDate?: Date;

  @Prop({ type: Number, default: 0 })
  executionCount: number; // How many times it has been executed

  // Status
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  // References to generated journal entries
  @Prop({ type: [Types.ObjectId], ref: 'JournalEntry', default: [] })
  generatedEntries: Types.ObjectId[];

  // Audit
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  // Notes
  @Prop({ type: String })
  notes?: string;

  // Timestamps (handled automatically by Mongoose)
  createdAt?: Date;
  updatedAt?: Date;
}

export const RecurringEntrySchema =
  SchemaFactory.createForClass(RecurringEntry);

// Índices
RecurringEntrySchema.index({ tenantId: 1, name: 1 }, { unique: true });
RecurringEntrySchema.index({ tenantId: 1, isActive: 1 });
RecurringEntrySchema.index({ tenantId: 1, nextExecutionDate: 1 });
RecurringEntrySchema.index({ tenantId: 1, frequency: 1 });
