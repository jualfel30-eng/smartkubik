import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CashRegisterSessionDocument = CashRegisterSession & Document;

/**
 * Fondo inicial por denominación/moneda
 */
@Schema()
export class CashFund {
  @Prop({ type: String, required: true })
  currency: string; // 'USD', 'VES'

  @Prop({ type: Number, required: true, default: 0 })
  amount: number;

  @Prop({ type: Object })
  denominations?: {
    // Billetes y monedas - cantidades por denominación
    d_500?: number;   // Billete de 500
    d_200?: number;   // Billete de 200
    d_100?: number;   // Billete de 100
    d_50?: number;    // Billete de 50
    d_20?: number;    // Billete de 20
    d_10?: number;    // Billete de 10
    d_5?: number;     // Billete de 5
    d_2?: number;     // Billete de 2 (USD)
    d_1?: number;     // Billete de 1
    coins?: number;   // Total en monedas
  };
}
const CashFundSchema = SchemaFactory.createForClass(CashFund);

/**
 * Registro de movimientos de efectivo (entradas/salidas manuales)
 */
@Schema()
export class CashMovement {
  @Prop({ type: String, required: true, enum: ['in', 'out'] })
  type: string; // 'in' = entrada, 'out' = salida

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, required: true })
  reason: string; // 'change_request', 'petty_cash', 'bank_deposit', 'expense', 'correction', 'other'

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  reference?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  authorizedBy?: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}
const CashMovementSchema = SchemaFactory.createForClass(CashMovement);

/**
 * Sesión de Caja (Cash Register Session)
 * Representa un turno/sesión de trabajo de un cajero
 */
@Schema({ timestamps: true })
export class CashRegisterSession {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: String, required: true })
  sessionNumber: string; // Número de sesión: CAJ-2024-001

  @Prop({ type: String, required: true })
  registerName: string; // Nombre/identificador de la caja: "Caja 1", "Caja Principal"

  @Prop({ type: String })
  registerId?: string; // ID del punto de venta físico (si aplica)

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  cashierId: Types.ObjectId; // Cajero responsable

  @Prop({ type: String, required: true })
  cashierName: string; // Nombre del cajero (desnormalizado)

  // === APERTURA DE CAJA ===
  @Prop({ type: Date, required: true })
  openedAt: Date;

  @Prop({ type: [CashFundSchema], default: [] })
  openingFunds: CashFund[]; // Fondo inicial por moneda

  @Prop({ type: Number, default: 0 })
  openingAmountUsd: number; // Total apertura USD

  @Prop({ type: Number, default: 0 })
  openingAmountVes: number; // Total apertura VES

  @Prop({ type: String })
  openingNotes?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  openedBy: Types.ObjectId;

  // === ESTADO DE LA SESIÓN ===
  @Prop({
    type: String,
    required: true,
    enum: ['open', 'closing', 'closed', 'suspended'],
    default: 'open',
    index: true
  })
  status: string;

  // === CIERRE DE CAJA ===
  @Prop({ type: Date })
  closedAt?: Date;

  @Prop({ type: [CashFundSchema], default: [] })
  closingFunds?: CashFund[]; // Conteo final por moneda

  @Prop({ type: Number })
  closingAmountUsd?: number; // Total cierre USD declarado

  @Prop({ type: Number })
  closingAmountVes?: number; // Total cierre VES declarado

  @Prop({ type: String })
  closingNotes?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  closedBy?: Types.ObjectId;

  // === MOVIMIENTOS MANUALES DE EFECTIVO ===
  @Prop({ type: [CashMovementSchema], default: [] })
  cashMovements: CashMovement[];

  // === REFERENCIA AL DOCUMENTO DE CIERRE ===
  @Prop({ type: Types.ObjectId, ref: "CashRegisterClosing" })
  closingDocumentId?: Types.ObjectId;

  // === METADATOS ===
  @Prop({ type: Number, default: 0 })
  totalTransactions: number; // Cantidad de transacciones procesadas

  @Prop({ type: Number, default: 0 })
  totalSalesUsd: number; // Total vendido USD

  @Prop({ type: Number, default: 0 })
  totalSalesVes: number; // Total vendido VES

  @Prop({ type: String })
  workShift?: string; // 'morning', 'afternoon', 'night'

  @Prop({ type: Object })
  metadata?: {
    ipAddress?: string;
    deviceId?: string;
    location?: string;
  };

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const CashRegisterSessionSchema = SchemaFactory.createForClass(CashRegisterSession);

// Índices optimizados
CashRegisterSessionSchema.index({ tenantId: 1, sessionNumber: 1 }, { unique: true });
CashRegisterSessionSchema.index({ tenantId: 1, cashierId: 1, status: 1 });
CashRegisterSessionSchema.index({ tenantId: 1, openedAt: -1 });
CashRegisterSessionSchema.index({ tenantId: 1, closedAt: -1 });
CashRegisterSessionSchema.index({ tenantId: 1, registerName: 1, status: 1 });
CashRegisterSessionSchema.index({ tenantId: 1, status: 1, openedAt: -1 });
