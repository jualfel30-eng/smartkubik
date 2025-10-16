import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BankTransactionDocument = BankTransaction & Document;

@Schema({ _id: false })
export class BankTransactionCounterpart {
  @Prop({ type: String })
  name?: string;

  @Prop({ type: String })
  rif?: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  bank?: string;

  @Prop({ type: String })
  accountNumber?: string;

  @Prop({ type: String })
  terminalId?: string;

  @Prop({ type: String })
  cardType?: string;

  @Prop({ type: String })
  voucher?: string;
}

const BankTransactionCounterpartSchema = SchemaFactory.createForClass(BankTransactionCounterpart);

@Schema({ timestamps: true })
export class BankTransaction {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BankAccount', required: true, index: true })
  bankAccountId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: ['credit', 'debit'],
  })
  type: 'credit' | 'debit';

  @Prop({
    type: String,
    required: true,
    enum: [
      'pago_movil',
      'transferencia',
      'pos',
      'deposito_cajero',
      'fee',
      'interest',
      'ajuste_manual',
      'otros',
    ],
  })
  channel: string;

  @Prop({ type: String, default: 'VES' })
  method?: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Number })
  balanceAfter?: number;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String })
  reference?: string;

  @Prop({ type: BankTransactionCounterpartSchema })
  counterpart?: BankTransactionCounterpart;

  @Prop({ type: Date, required: true, index: true })
  transactionDate: Date;

  @Prop({ type: Date })
  bookingDate?: Date;

  @Prop({ type: Boolean, default: false, index: true })
  reconciled?: boolean;

  @Prop({ type: Date })
  reconciledAt?: Date;

  @Prop({ type: String })
  importedFrom?: string;

  @Prop({ type: Types.ObjectId, ref: 'BankStatementImport' })
  statementImportId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['pending', 'matched', 'manually_matched', 'rejected', 'in_review'],
    default: 'pending',
    index: true,
  })
  reconciliationStatus: string;

  @Prop({ type: Types.ObjectId, ref: 'BankReconciliation' })
  reconciliationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  statementTransactionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BankTransaction' })
  linkedMovementId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry' })
  journalEntryId?: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ type: String })
  transferGroupId?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const BankTransactionSchema = SchemaFactory.createForClass(BankTransaction);

BankTransactionSchema.index({ tenantId: 1, bankAccountId: 1, transactionDate: -1 });
BankTransactionSchema.index({ tenantId: 1, channel: 1, reference: 1 }, { sparse: true });
BankTransactionSchema.index({ paymentId: 1 }, { sparse: true });
BankTransactionSchema.index({ reconciliationId: 1, statementTransactionId: 1 }, { sparse: true });
BankTransactionSchema.index({ transferGroupId: 1 });
BankTransactionSchema.index({ bankAccountId: 1, reconciled: 1, transactionDate: -1 });
BankTransactionSchema.index({ tenantId: 1, reconciled: 1, transactionDate: -1 });
