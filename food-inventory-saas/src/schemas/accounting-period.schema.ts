import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AccountingPeriodDocument = AccountingPeriod & Document;

export type PeriodStatus = 'open' | 'closed' | 'locked';

@Schema({ timestamps: true })
export class AccountingPeriod {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // e.g., "Enero 2024", "Q1 2024"

  @Prop({ required: true, type: Date })
  startDate: Date;

  @Prop({ required: true, type: Date })
  endDate: Date;

  @Prop({ required: true, type: Number })
  fiscalYear: number;

  @Prop({ type: String, default: 'open', enum: ['open', 'closed', 'locked'] })
  status: PeriodStatus;

  @Prop({ type: Date })
  closedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  closedBy?: Types.ObjectId;

  @Prop({ type: String })
  closingNotes?: string;

  // Closing entry reference
  @Prop({ type: Types.ObjectId, ref: 'JournalEntry' })
  closingEntryId?: Types.ObjectId;

  // Summary data at closing
  @Prop({ type: Number })
  totalRevenue?: number;

  @Prop({ type: Number })
  totalExpenses?: number;

  @Prop({ type: Number })
  netIncome?: number;

  @Prop({ type: String })
  notes?: string;

  // Audit
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  // Timestamps (manejados automáticamente por Mongoose)
  createdAt?: Date;
  updatedAt?: Date;
}

export const AccountingPeriodSchema =
  SchemaFactory.createForClass(AccountingPeriod);

// Índices
AccountingPeriodSchema.index({ tenantId: 1, fiscalYear: 1 });
AccountingPeriodSchema.index({ tenantId: 1, startDate: 1, endDate: 1 });
AccountingPeriodSchema.index({ tenantId: 1, status: 1 });
AccountingPeriodSchema.index(
  { tenantId: 1, name: 1 },
  { unique: true },
);
