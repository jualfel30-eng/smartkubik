import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BankAccountDocument = BankAccount & Document;

@Schema({ timestamps: true })
export class BankAccount {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  bankName: string;

  @Prop({ required: true })
  accountNumber: string;

  @Prop({ required: true })
  accountType: 'corriente' | 'ahorro' | 'nomina' | 'otra';

  @Prop({ required: true, default: 'VES' })
  currency: string;

  @Prop({ required: true })
  initialBalance: number;

  @Prop({ required: true, default: 0 })
  currentBalance: number;

  @Prop({ default: '' })
  accountHolderName: string;

  @Prop({ default: '' })
  branchName: string;

  @Prop({ default: '' })
  swiftCode: string;

  @Prop({ default: '' })
  notes: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastReconciliationDate?: Date;
}

export const BankAccountSchema = SchemaFactory.createForClass(BankAccount);

// Índices compuestos
BankAccountSchema.index({ tenantId: 1, bankName: 1 });
BankAccountSchema.index({ tenantId: 1, isActive: 1 });
