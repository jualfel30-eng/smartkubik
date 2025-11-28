import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type LoyaltyTransactionDocument = LoyaltyTransaction & Document;

@Schema({ timestamps: true })
export class LoyaltyTransaction {
  @Prop({ type: Types.ObjectId, ref: "Customer", required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["earn", "redeem", "expire", "adjust"],
    required: true,
    index: true,
  })
  type: string; // earn: ganar puntos, redeem: redimir, expire: expirar, adjust: ajuste manual

  @Prop({ type: Number, required: true })
  points: number; // Cantidad de puntos (positivo para earn/adjust+, negativo para redeem/expire)

  @Prop({ type: Number, required: true })
  balanceAfter: number; // Balance total después de esta transacción

  @Prop({ type: String, maxlength: 500 })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: "Order" })
  orderId?: Types.ObjectId; // Referencia a la orden (si aplica)

  @Prop({ type: Number })
  orderAmount?: number; // Monto de la orden (para transacciones de tipo earn)

  @Prop({ type: Number })
  pointsRate?: number; // Tasa de conversión usada (puntos por dólar)

  @Prop({
    type: String,
    enum: ["admin_adjustment", "correction", "bonus", "penalty", "purchase", "redemption", "expiration"],
  })
  subType?: string; // Subtipo para mayor detalle

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId; // Usuario que creó la transacción (para ajustes manuales)

  @Prop({ type: Date })
  expiresAt?: Date; // Fecha de expiración de puntos ganados (si aplica)

  @Prop({ type: Object })
  metadata?: {
    reason?: string;
    campaign?: string;
    tier?: string;
    [key: string]: any;
  };
}

export const LoyaltyTransactionSchema =
  SchemaFactory.createForClass(LoyaltyTransaction);

// Índices compuestos
LoyaltyTransactionSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
LoyaltyTransactionSchema.index({ tenantId: 1, type: 1, createdAt: -1 });
LoyaltyTransactionSchema.index({ tenantId: 1, orderId: 1 });
LoyaltyTransactionSchema.index({ expiresAt: 1 }); // Para job de expiración
