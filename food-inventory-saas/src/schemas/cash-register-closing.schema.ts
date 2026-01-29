import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CashRegisterClosingDocument = CashRegisterClosing & Document;

/**
 * Resumen por método de pago
 */
@Schema()
export class PaymentMethodSummary {
  @Prop({ type: String, required: true })
  methodId: string; // 'efectivo_usd', 'transferencia_ves', etc.

  @Prop({ type: String, required: true })
  methodName: string; // Nombre legible

  @Prop({ type: String, required: true })
  currency: string; // 'USD' o 'VES'

  @Prop({ type: Number, default: 0 })
  transactionCount: number; // Cantidad de transacciones

  @Prop({ type: Number, default: 0 })
  totalAmount: number; // Monto total en moneda original

  @Prop({ type: Number, default: 0 })
  totalAmountUsd: number; // Equivalente en USD

  @Prop({ type: Number, default: 0 })
  totalAmountVes: number; // Equivalente en VES

  @Prop({ type: Number, default: 0 })
  igtfAmount: number; // IGTF cobrado (si aplica)

  @Prop({ type: Number, default: 0 })
  tipsAmount: number; // Propinas recibidas por este método
}
const PaymentMethodSummarySchema = SchemaFactory.createForClass(PaymentMethodSummary);

/**
 * Resumen de impuestos
 */
@Schema()
export class TaxSummary {
  @Prop({ type: String, required: true })
  taxType: string; // 'IVA', 'IGTF'

  @Prop({ type: Number, required: true })
  rate: number; // 16, 3, etc.

  @Prop({ type: Number, default: 0 })
  baseAmount: number; // Base imponible

  @Prop({ type: Number, default: 0 })
  taxAmount: number; // Monto del impuesto

  @Prop({ type: Number, default: 0 })
  transactionCount: number;
}
const TaxSummarySchema = SchemaFactory.createForClass(TaxSummary);

/**
 * Resumen de cambios/vueltos dados
 */
@Schema()
export class ChangeGivenSummary {
  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: Number, default: 0 })
  totalChangeGiven: number; // Total de vueltos dados

  @Prop({ type: Number, default: 0 })
  transactionCount: number; // Transacciones con vuelto
}
const ChangeGivenSummarySchema = SchemaFactory.createForClass(ChangeGivenSummary);

/**
 * Diferencia de caja (sobrante/faltante)
 */
@Schema()
export class CashDifference {
  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: Number, default: 0 })
  expectedAmount: number; // Lo que debería haber

  @Prop({ type: Number, default: 0 })
  declaredAmount: number; // Lo que el cajero declaró

  @Prop({ type: Number, default: 0 })
  difference: number; // Diferencia (positivo = sobrante, negativo = faltante)

  @Prop({ type: String })
  status: string; // 'balanced', 'surplus', 'shortage'

  @Prop({ type: String })
  explanation?: string; // Explicación del cajero si hay diferencia
}
const CashDifferenceSchema = SchemaFactory.createForClass(CashDifference);

/**
 * Transacción individual (referencia resumida)
 */
@Schema()
export class ClosingTransactionRef {
  @Prop({ type: Types.ObjectId, ref: "Order", required: true })
  orderId: Types.ObjectId;

  @Prop({ type: String, required: true })
  orderNumber: string;

  @Prop({ type: Date, required: true })
  timestamp: Date;

  @Prop({ type: String, required: true })
  customerName: string;

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: Number })
  totalAmountVes?: number;

  @Prop({ type: String, required: true })
  paymentStatus: string;

  @Prop({ type: [String], default: [] })
  paymentMethods: string[]; // Métodos usados

  @Prop({ type: String })
  status: string; // Estado de la orden

  @Prop({ type: Number, default: 0 })
  ivaAmount: number;

  @Prop({ type: Number, default: 0 })
  igtfAmount: number;

  @Prop({ type: Number, default: 0 })
  tipAmount: number;

  @Prop({ type: Number, default: 0 })
  discountAmount: number;
}
const ClosingTransactionRefSchema = SchemaFactory.createForClass(ClosingTransactionRef);

/**
 * Documento de Cierre de Caja (Cash Register Closing)
 * Documento inmutable que registra el cierre de una sesión de caja
 */
@Schema({ timestamps: true })
export class CashRegisterClosing {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: String, required: true })
  closingNumber: string; // Número de cierre: CIE-2024-001

  // === REFERENCIAS ===
  @Prop({ type: Types.ObjectId, ref: "CashRegisterSession", required: true })
  sessionId: Types.ObjectId;

  @Prop({ type: String, required: true })
  sessionNumber: string;

  @Prop({ type: String, required: true })
  registerName: string;

  // === PERÍODO DEL CIERRE ===
  @Prop({ type: Date, required: true })
  periodStart: Date; // Inicio del período (apertura)

  @Prop({ type: Date, required: true })
  periodEnd: Date; // Fin del período (cierre)

  // === CAJERO ===
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  cashierId: Types.ObjectId;

  @Prop({ type: String, required: true })
  cashierName: string;

  // === TIPO DE CIERRE ===
  @Prop({
    type: String,
    required: true,
    enum: ['individual', 'consolidated'], // individual = una caja, consolidated = todas las cajas
    default: 'individual'
  })
  closingType: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: "CashRegisterSession" }], default: [] })
  includedSessions?: Types.ObjectId[]; // Para cierres consolidados

  // === RESUMEN GENERAL ===
  @Prop({ type: Number, default: 0 })
  totalTransactions: number;

  @Prop({ type: Number, default: 0 })
  totalGrossSalesUsd: number; // Ventas brutas USD

  @Prop({ type: Number, default: 0 })
  totalGrossSalesVes: number; // Ventas brutas VES

  @Prop({ type: Number, default: 0 })
  totalNetSalesUsd: number; // Ventas netas (sin impuestos) USD

  @Prop({ type: Number, default: 0 })
  totalNetSalesVes: number; // Ventas netas VES

  @Prop({ type: Number, default: 0 })
  totalDiscountsUsd: number;

  @Prop({ type: Number, default: 0 })
  totalDiscountsVes: number;

  @Prop({ type: Number, default: 0 })
  totalRefundsUsd: number; // Devoluciones

  @Prop({ type: Number, default: 0 })
  totalRefundsVes: number;

  @Prop({ type: Number, default: 0 })
  totalCancelledUsd: number; // Anulaciones

  @Prop({ type: Number, default: 0 })
  totalCancelledVes: number;

  // === RESUMEN POR MÉTODO DE PAGO ===
  @Prop({ type: [PaymentMethodSummarySchema], default: [] })
  paymentMethodSummary: PaymentMethodSummary[];

  // === RESUMEN DE EFECTIVO ===
  @Prop({ type: Number, default: 0 })
  cashReceivedUsd: number; // Efectivo recibido USD

  @Prop({ type: Number, default: 0 })
  cashReceivedVes: number; // Efectivo recibido VES

  @Prop({ type: [ChangeGivenSummarySchema], default: [] })
  changeGiven: ChangeGivenSummary[]; // Cambios/vueltos dados

  // === DIFERENCIAS DE CAJA ===
  @Prop({ type: [CashDifferenceSchema], default: [] })
  cashDifferences: CashDifference[];

  @Prop({ type: Boolean, default: false })
  hasDifferences: boolean; // Flag rápido para filtrar

  // === IMPUESTOS ===
  @Prop({ type: [TaxSummarySchema], default: [] })
  taxSummary: TaxSummary[];

  @Prop({ type: Number, default: 0 })
  totalIvaCollected: number;

  @Prop({ type: Number, default: 0 })
  totalIgtfCollected: number;

  // === PROPINAS ===
  @Prop({ type: Number, default: 0 })
  totalTipsUsd: number;

  @Prop({ type: Number, default: 0 })
  totalTipsVes: number;

  // === MOVIMIENTOS DE EFECTIVO ===
  @Prop({ type: Number, default: 0 })
  cashInMovementsUsd: number; // Entradas de efectivo

  @Prop({ type: Number, default: 0 })
  cashInMovementsVes: number;

  @Prop({ type: Number, default: 0 })
  cashOutMovementsUsd: number; // Salidas de efectivo

  @Prop({ type: Number, default: 0 })
  cashOutMovementsVes: number;

  // === FONDOS ===
  @Prop({ type: Number, default: 0 })
  openingFundUsd: number;

  @Prop({ type: Number, default: 0 })
  openingFundVes: number;

  @Prop({ type: Number, default: 0 })
  closingFundUsd: number; // Efectivo declarado al cerrar

  @Prop({ type: Number, default: 0 })
  closingFundVes: number;

  @Prop({ type: Number, default: 0 })
  expectedCashUsd: number; // Efectivo esperado (calculado)

  @Prop({ type: Number, default: 0 })
  expectedCashVes: number;

  // === TIPO DE CAMBIO ===
  @Prop({ type: Number, required: true })
  exchangeRate: number; // Tasa usada para el cierre

  @Prop({ type: String })
  exchangeRateSource?: string; // 'BCV', 'manual', etc.

  // === TRANSACCIONES DETALLADAS ===
  @Prop({ type: [ClosingTransactionRefSchema], default: [] })
  transactions: ClosingTransactionRef[];

  // === ESTADO Y APROBACIÓN ===
  @Prop({
    type: String,
    required: true,
    enum: ['draft', 'pending_approval', 'approved', 'rejected'],
    default: 'draft',
    index: true
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: String })
  approvalNotes?: string;

  @Prop({ type: String })
  rejectionReason?: string;

  // === NOTAS Y OBSERVACIONES ===
  @Prop({ type: String })
  cashierNotes?: string; // Notas del cajero

  @Prop({ type: String })
  supervisorNotes?: string; // Notas del supervisor

  // === EXPORTACIÓN ===
  @Prop({ type: Boolean, default: false })
  exported: boolean;

  @Prop({ type: Date })
  exportedAt?: Date;

  @Prop({ type: String })
  exportFormat?: string; // 'pdf', 'csv', 'excel'

  // === AUDITORÍA ===
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const CashRegisterClosingSchema = SchemaFactory.createForClass(CashRegisterClosing);

// Índices optimizados
CashRegisterClosingSchema.index({ tenantId: 1, closingNumber: 1 }, { unique: true });
CashRegisterClosingSchema.index({ tenantId: 1, sessionId: 1 });
CashRegisterClosingSchema.index({ tenantId: 1, cashierId: 1, periodEnd: -1 });
CashRegisterClosingSchema.index({ tenantId: 1, periodEnd: -1 });
CashRegisterClosingSchema.index({ tenantId: 1, closingType: 1, periodEnd: -1 });
CashRegisterClosingSchema.index({ tenantId: 1, status: 1, periodEnd: -1 });
CashRegisterClosingSchema.index({ tenantId: 1, hasDifferences: 1, periodEnd: -1 });
CashRegisterClosingSchema.index({ tenantId: 1, registerName: 1, periodEnd: -1 });
