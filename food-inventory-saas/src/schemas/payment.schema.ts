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

  // Monto equivalente en VES (opcional para pagos registrados en VES)
  @Prop({ type: Number })
  amountVes?: number;

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

  @Prop({ type: Types.ObjectId, ref: "Customer" })
  customerId?: Types.ObjectId; // Cliente asociado (cobros)

  @Prop({ type: String })
  transactionId?: string; // ID de transacción externa

  @Prop({ type: String })
  receiptUrl?: string; // URL del recibo generado

  @Prop({ type: Boolean, default: false })
  receiptSent?: boolean; // Si se envió recibo

  @Prop({ type: Number })
  serviceFee?: number; // Comisión de servicio

  // === Cash Tender & Change Tracking ===
  @Prop({ type: Number })
  amountTendered?: number; // Monto entregado por el cliente (solo para cash)

  @Prop({ type: Number, default: 0 })
  changeGiven?: number; // Vuelto dado al cliente (solo para cash)

  @Prop({ type: Object })
  changeGivenBreakdown?: {
    usd: number;           // Vuelto en USD (efectivo)
    ves: number;           // Vuelto en VES (efectivo o digital)
    vesMethod?: string;    // 'efectivo_ves' | 'pago_movil_ves'
  };

  @Prop({ type: Boolean, default: false })
  isLegacyPayment?: boolean; // Marca pagos anteriores a esta feature

  // === Robustez / Nuevos campos ===
  @Prop({ type: String, index: true })
  idempotencyKey?: string;

  @Prop({
    type: [
      {
        documentId: { type: Types.ObjectId, required: true },
        documentType: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    default: [],
  })
  allocations?: Array<{
    documentId: Types.ObjectId;
    documentType: string;
    amount: number;
  }>;

  @Prop({
    type: {
      igtf: { type: Number },
      other: { type: Number },
    },
  })
  fees?: {
    igtf?: number;
    other?: number;
  };

  // Conciliación bancaria
  @Prop({ type: String, enum: ["pending", "matched", "manual", "rejected"], default: "pending", index: true })
  reconciliationStatus?: string;

  @Prop({ type: String })
  statementRef?: string;

  @Prop({ type: Date })
  reconciledAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  reconciledBy?: Types.ObjectId;

  // Historial de estados
  @Prop({
    type: [
      {
        status: { type: String, required: true },
        reason: { type: String },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Types.ObjectId, ref: "User" },
      },
    ],
    default: [],
  })
  statusHistory?: Array<{
    status: string;
    reason?: string;
    changedAt?: Date;
    changedBy?: Types.ObjectId;
  }>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ tenantId: 1, paymentType: 1, date: -1 });
PaymentSchema.index({ tenantId: 1, orderId: 1 });
PaymentSchema.index({ tenantId: 1, payableId: 1 });
PaymentSchema.index({ tenantId: 1, splitId: 1 });
PaymentSchema.index({ tenantId: 1, method: 1, date: -1 });
PaymentSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true },
);
PaymentSchema.index({ tenantId: 1, customerId: 1, date: -1 });
