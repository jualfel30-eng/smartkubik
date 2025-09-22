import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BankReconciliationDocument = BankReconciliation & Document;

@Schema({ timestamps: true })
export class BankReconciliation {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BankStatement', required: true })
  bankStatementId: Types.ObjectId;

  @Prop({ required: true })
  reconciliationDate: Date;

  @Prop({ required: true })
  closingBalance: number;

  @Prop([{ type: Types.ObjectId, ref: 'JournalEntry' }])
  clearedTransactions: Types.ObjectId[];

  @Prop([{ type: Types.ObjectId, ref: 'JournalEntry' }])
  outstandingTransactions: Types.ObjectId[];

  @Prop({ default: 'in_progress' })
  status: 'in_progress' | 'completed';
}

export const BankReconciliationSchema = SchemaFactory.createForClass(BankReconciliation);
