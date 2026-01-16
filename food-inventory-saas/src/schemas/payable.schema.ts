import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PayableDocument = Payable & Document;

@Schema()
export class PayableStatusHistory {
  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: true, default: Date.now })
  changedAt: Date;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  changedBy: Types.ObjectId;

  @Prop({ type: String })
  notes?: string;
}
const PayableStatusHistorySchema =
  SchemaFactory.createForClass(PayableStatusHistory);

@Schema()
export class PayableLine {
  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Number })
  quantity?: number;

  @Prop({ type: Number })
  unitPrice?: number;

  @Prop({ type: Types.ObjectId, ref: "Product" })
  productId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "ChartOfAccount", required: true })
  accountId: Types.ObjectId;
}
export const PayableLineSchema = SchemaFactory.createForClass(PayableLine);

@Schema({ timestamps: true })
export class Payable {
  @Prop({ type: String, required: true, unique: true, index: true })
  payableNumber: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({
    type: String,
    required: true,
    enum: [
      "purchase_order",
      "payroll",
      "service_payment",
      "utility_bill",
      "other",
    ],
  })
  type: string;

  @Prop({
    type: String,
    required: true,
    enum: ["supplier", "employee", "custom"],
  })
  payeeType: string;

  @Prop({ type: Types.ObjectId, refPath: "payeeType" })
  payeeId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  payeeName: string;

  @Prop({ type: Date, required: true })
  issueDate: Date;

  @Prop({ type: Date })
  dueDate?: Date;

  @Prop({ type: String })
  description?: string;

  // Moneda esperada para el pago (USD, VES, EUR, USD_BCV, EUR_BCV)
  @Prop({
    type: String,
    enum: ["USD", "VES", "EUR", "USD_BCV", "EUR_BCV"],
    default: "USD",
    index: true,
  })
  expectedCurrency: string;

  // Métodos de pago esperados (heredados de la orden de compra)
  @Prop({ type: [String], default: [] })
  expectedPaymentMethods: string[];

  @Prop({ type: [PayableLineSchema] })
  lines: PayableLine[];

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: Number, default: 0 })
  totalAmountVes: number;

  @Prop({ type: Number, required: true, default: 0 })
  paidAmount: number;

  @Prop({ type: Number, default: 0 })
  paidAmountVes: number;

  @Prop({ type: Boolean, default: false })
  isCredit: boolean;

  @Prop({
    type: [
      {
        method: String,
        amount: Number,
        amountVes: Number,
        exchangeRate: Number,
        currency: String,
        reference: String,
        date: Date,
        isConfirmed: { type: Boolean, default: false },
        bankAccountId: { type: Types.ObjectId, ref: "BankAccount" },
        confirmedAt: Date,
        confirmedMethod: String,
      },
    ],
    default: [],
  })
  paymentRecords: Array<{
    method: string;
    amount: number;
    amountVes?: number;
    exchangeRate?: number;
    currency?: string;
    reference?: string;
    date: Date;
    isConfirmed: boolean;
    bankAccountId?: Types.ObjectId;
    confirmedAt?: Date;
    confirmedMethod?: string;
  }>;

  @Prop({ type: String, required: true, default: "draft", index: true })
  status: string;

  @Prop({ type: [PayableStatusHistorySchema] })
  history: PayableStatusHistory[];

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: "PurchaseOrder" })
  relatedPurchaseOrderId?: Types.ObjectId;
}

export const PayableSchema = SchemaFactory.createForClass(Payable);

PayableSchema.index({ tenantId: 1, status: 1 });
PayableSchema.index({ tenantId: 1, type: 1 });
PayableSchema.index({ tenantId: 1, payeeName: 1 });
PayableSchema.index({ tenantId: 1, expectedCurrency: 1 });
PayableSchema.index({ tenantId: 1, dueDate: 1 }); // Para aging report
