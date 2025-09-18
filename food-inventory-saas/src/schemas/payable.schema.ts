import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PayableDocument = Payable & Document;

@Schema()
export class PayableStatusHistory {
  @Prop({ required: true })
  status: string; // draft, open, partially_paid, paid, void

  @Prop({ required: true, default: Date.now })
  changedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  changedBy: Types.ObjectId;

  @Prop()
  notes?: string;
}

@Schema()
export class PayableLine {
  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop()
  quantity?: number;

  @Prop()
  unitPrice?: number;

  @Prop({ type: Types.ObjectId, ref: 'Product' })
  productId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ChartOfAccount', required: true })
  accountId: Types.ObjectId; // The expense account to debit
}
export const PayableLineSchema = SchemaFactory.createForClass(PayableLine);

@Schema({ timestamps: true })
export class Payable {
  @Prop({ required: true, unique: true, index: true })
  payableNumber: string; // Generic invoice/payable number

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, enum: ['purchase_order', 'payroll', 'service_payment', 'utility_bill', 'other'] })
  type: string;

  @Prop({ required: true, enum: ['supplier', 'employee', 'custom'] })
  payeeType: string;

  @Prop({ type: Types.ObjectId, refPath: 'payeeType' }) // Dynamic ref based on payeeType
  payeeId?: Types.ObjectId;

  @Prop({ required: true })
  payeeName: string; // For display, or if payee is 'custom'

  @Prop({ required: true })
  issueDate: Date;

  @Prop()
  dueDate?: Date;

  @Prop()
  description?: string;

  @Prop([PayableLineSchema])
  lines: PayableLine[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true, default: 0 })
  paidAmount: number;

  @Prop({ required: true, default: 'draft', index: true })
  status: string; // draft, open, partially_paid, paid, void

  @Prop([PayableStatusHistory])
  history: PayableStatusHistory[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop()
  notes?: string;
  
  @Prop({ type: Types.ObjectId, ref: 'PurchaseOrder' })
  relatedPurchaseOrderId?: Types.ObjectId;
}

export const PayableSchema = SchemaFactory.createForClass(Payable);

PayableSchema.index({ tenantId: 1, status: 1 });
PayableSchema.index({ tenantId: 1, type: 1 });
PayableSchema.index({ tenantId: 1, payeeName: 1 });
