import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BankStatementTransactionDocument = BankStatementTransaction & Document;

@Schema({ _id: false })
export class BankStatementTransaction {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: null })
  journalEntryLineId?: Types.ObjectId;

  @Prop({ default: 'unmatched' })
  status: 'unmatched' | 'matched' | 'manually_matched';
}

export const BankStatementTransactionSchema = SchemaFactory.createForClass(BankStatementTransaction);

export type BankStatementDocument = BankStatement & Document;

@Schema({ timestamps: true })
export class BankStatement {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ChartOfAccount', required: true })
  bankAccountId: Types.ObjectId;

  @Prop({ required: true })
  statementDate: Date;

  @Prop({ required: true })
  startingBalance: number;

  @Prop({ required: true })
  endingBalance: number;

  @Prop([BankStatementTransactionSchema])
  transactions: BankStatementTransaction[];

  @Prop({ default: 'draft' })
  status: 'draft' | 'imported' | 'reconciling' | 'reconciled';
}

export const BankStatementSchema = SchemaFactory.createForClass(BankStatement);
