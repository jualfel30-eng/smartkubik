import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({
    type: String,
    required: true,
    enum: ["sale", "payable"],
    index: true,
  })
  paymentType: string;

  @Prop({ type: Types.ObjectId, ref: "Order", required: false })
  orderId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Payable", required: false })
  payableId?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true })
  method: string;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String })
  reference?: string;

  @Prop({ type: Types.ObjectId, ref: "BankAccount", required: false })
  bankAccountId?: Types.ObjectId;

  @Prop({ type: String, required: true, default: "confirmed" })
  status: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  confirmedBy?: Types.ObjectId;

  // ========================================
  // NUEVOS CAMPOS PARA SPLIT BILLS
  // ========================================

  @Prop({ type: Number, default: 0 })
  tipAmount?: number; // Propina incluida en este pago

  @Prop({ type: Number })
  tipPercentage?: number; // Porcentaje de propina aplicado

  @Prop({ type: Types.ObjectId, ref: "BillSplit" })
  splitId?: Types.ObjectId; // Si es parte de una cuenta dividida

  @Prop({ type: String })
  customerName?: string; // Nombre del cliente que realiza este pago (para splits)

  @Prop({ type: Object })
  cardDetails?: {
    last4?: string;
    brand?: string;
    cardholderName?: string;
  };

  @Prop({ type: String })
  transactionId?: string; // ID de transacción externa

  @Prop({ type: String })
  receiptUrl?: string; // URL del recibo generado

  @Prop({ type: Boolean, default: false })
  receiptSent?: boolean; // Si se envió recibo

  @Prop({ type: Number })
  serviceFee?: number; // Comisión de servicio
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ tenantId: 1, paymentType: 1, date: -1 });
PaymentSchema.index({ tenantId: 1, orderId: 1 });
PaymentSchema.index({ tenantId: 1, payableId: 1 });
PaymentSchema.index({ tenantId: 1, splitId: 1 });
PaymentSchema.index({ tenantId: 1, method: 1, date: -1 });
