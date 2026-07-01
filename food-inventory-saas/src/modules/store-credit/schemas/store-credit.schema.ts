import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type StoreCreditAccountDocument = StoreCreditAccount & Document;
export type StoreCreditMovementDocument = StoreCreditMovement & Document;

/**
 * Saldo a favor (store credit) de un cliente en un tenant. Un documento por
 * (tenant, cliente). El balance se muta atómicamente con `$inc` para evitar
 * carreras (ver docs/wiki/patterns/sequential-number-races.md — misma clase de
 * problema). El ledger `StoreCreditMovement` guarda la traza de cada cambio.
 */
@Schema({ timestamps: true })
export class StoreCreditAccount {
  @Prop({ type: Types.ObjectId, required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  balance: number;

  @Prop({ type: String, default: "USD" })
  currency: string;
}

export const StoreCreditAccountSchema =
  SchemaFactory.createForClass(StoreCreditAccount);
// Una cuenta de saldo por cliente y tenant.
StoreCreditAccountSchema.index(
  { tenantId: 1, customerId: 1 },
  { unique: true },
);

/**
 * Movimiento del ledger de saldo a favor (append-only). `balanceAfter` deja el
 * saldo resultante para auditoría — nunca se recalcula desde cero.
 */
@Schema({ timestamps: true })
export class StoreCreditMovement {
  @Prop({ type: Types.ObjectId, required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  customerId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ["credit", "debit"] })
  type: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Number, required: true })
  balanceAfter: number;

  @Prop({ type: String, default: "USD" })
  currency: string;

  // De dónde vino el movimiento: devolución, redención en una orden, ajuste.
  @Prop({
    type: String,
    required: true,
    enum: ["return", "order_redemption", "manual"],
  })
  source: string;

  @Prop({ type: Types.ObjectId })
  referenceId?: Types.ObjectId; // orderId / returnId

  @Prop({ type: String })
  reference?: string; // RET-2026-0001 / ORD-...

  @Prop({ type: String })
  reason?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;
}

export const StoreCreditMovementSchema =
  SchemaFactory.createForClass(StoreCreditMovement);
StoreCreditMovementSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
