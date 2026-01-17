import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type BinancePayTransactionDocument = BinancePayTransaction & Document;

/**
 * Estados de una transacción de Binance Pay
 */
export enum BinancePayStatus {
  INITIAL = "INITIAL", // Orden creada, esperando pago
  PENDING = "PENDING", // Pago pendiente de confirmación
  PAID = "PAID", // Pago completado exitosamente
  CANCELED = "CANCELED", // Orden cancelada
  EXPIRED = "EXPIRED", // Orden expirada
  REFUNDING = "REFUNDING", // Reembolso en proceso
  REFUNDED = "REFUNDED", // Reembolso completado
  ERROR = "ERROR", // Error en el procesamiento
}

/**
 * Tipos de transacción
 */
export enum BinancePayTransactionType {
  SUBSCRIPTION = "subscription", // Pago de suscripción del SaaS
  ONE_TIME = "one_time", // Pago único
  ADDON = "addon", // Compra de add-on o feature adicional
}

@Schema({ timestamps: true })
export class BinancePayTransaction {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  /**
   * ID único de la orden generado por nuestro sistema
   * Formato: BPAY-{tenantId}-{timestamp}-{random}
   */
  @Prop({ type: String, required: true, unique: true, index: true })
  merchantTradeNo: string;

  /**
   * ID de la orden devuelto por Binance Pay
   */
  @Prop({ type: String, index: true })
  prepayId?: string;

  /**
   * Tipo de transacción
   */
  @Prop({
    type: String,
    required: true,
    enum: Object.values(BinancePayTransactionType),
  })
  transactionType: string;

  /**
   * ID del plan de suscripción (si aplica)
   */
  @Prop({ type: Types.ObjectId, ref: "SubscriptionPlan" })
  subscriptionPlanId?: Types.ObjectId;

  /**
   * Descripción del producto/servicio
   */
  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String })
  productDetail?: string;

  /**
   * Monto en la moneda especificada
   */
  @Prop({ type: Number, required: true })
  orderAmount: number;

  /**
   * Moneda del pago (USDT, BUSD, BNB, etc.)
   */
  @Prop({ type: String, required: true, default: "USDT" })
  currency: string;

  /**
   * Estado actual de la transacción
   */
  @Prop({
    type: String,
    required: true,
    enum: Object.values(BinancePayStatus),
    default: BinancePayStatus.INITIAL,
    index: true,
  })
  status: string;

  /**
   * URL de checkout de Binance Pay
   */
  @Prop({ type: String })
  checkoutUrl?: string;

  /**
   * QR code data para pago
   */
  @Prop({ type: String })
  qrcodeLink?: string;

  /**
   * Código QR universal
   */
  @Prop({ type: String })
  universalUrl?: string;

  /**
   * Deep link para app de Binance
   */
  @Prop({ type: String })
  deeplink?: string;

  /**
   * Fecha de expiración del pago
   */
  @Prop({ type: Date })
  expireTime?: Date;

  /**
   * Información del pagador (de Binance)
   */
  @Prop({
    type: {
      binanceId: String,
      accountId: String,
    },
  })
  payer?: {
    binanceId?: string;
    accountId?: string;
  };

  /**
   * ID de transacción de Binance (cuando se completa)
   */
  @Prop({ type: String })
  transactionalId?: string;

  /**
   * Datos de respuesta raw de Binance (para debugging)
   */
  @Prop({ type: Object })
  rawResponse?: Record<string, any>;

  /**
   * Historial de estados
   */
  @Prop({
    type: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        webhookData: { type: Object },
        errorMessage: { type: String },
      },
    ],
    default: [],
  })
  statusHistory: Array<{
    status: string;
    changedAt: Date;
    webhookData?: Record<string, any>;
    errorMessage?: string;
  }>;

  /**
   * Metadatos adicionales
   */
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  /**
   * Usuario que creó la transacción (puede ser null si es self-service)
   */
  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  /**
   * Email del comprador
   */
  @Prop({ type: String })
  buyerEmail?: string;

  /**
   * Nombre del comprador
   */
  @Prop({ type: String })
  buyerName?: string;

  /**
   * Si el webhook fue procesado
   */
  @Prop({ type: Boolean, default: false })
  webhookProcessed: boolean;

  /**
   * Fecha de procesamiento del webhook
   */
  @Prop({ type: Date })
  webhookProcessedAt?: Date;

  /**
   * Información de reembolso (si aplica)
   */
  @Prop({
    type: {
      refundId: String,
      refundAmount: Number,
      refundReason: String,
      refundedAt: Date,
    },
  })
  refundInfo?: {
    refundId?: string;
    refundAmount?: number;
    refundReason?: string;
    refundedAt?: Date;
  };
}

export const BinancePayTransactionSchema = SchemaFactory.createForClass(
  BinancePayTransaction,
);

// Índices compuestos para consultas frecuentes
BinancePayTransactionSchema.index({ tenantId: 1, status: 1 });
BinancePayTransactionSchema.index({ tenantId: 1, transactionType: 1 });
BinancePayTransactionSchema.index({ tenantId: 1, createdAt: -1 });
BinancePayTransactionSchema.index({ prepayId: 1 }, { sparse: true });
BinancePayTransactionSchema.index(
  { merchantTradeNo: 1 },
  { unique: true },
);
