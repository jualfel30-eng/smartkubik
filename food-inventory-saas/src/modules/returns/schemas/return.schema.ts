import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ReturnDocument = Return & Document;

/**
 * Una línea devuelta. Guarda la cantidad tanto en unidad de venta como en
 * unidad base para que el reingreso de stock respete multi-unidad, y el
 * movimiento de inventario generado para trazabilidad.
 */
@Schema({ _id: false })
export class ReturnItem {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  productSku: string;

  @Prop({ type: String })
  productName?: string;

  @Prop({ type: Number, required: true })
  quantity: number; // en la unidad de venta original

  @Prop({ type: String })
  selectedUnit?: string;

  @Prop({ type: Number })
  conversionFactor?: number;

  @Prop({ type: Number })
  quantityInBaseUnit?: number; // cantidad reingresada al inventario

  @Prop({ type: Number, required: true })
  unitPrice: number;

  @Prop({ type: Number, required: true, default: 0 })
  refundAmount: number; // subtotal reembolsado de esta línea (USD)

  @Prop({ type: Types.ObjectId })
  warehouseId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "InventoryMovement" })
  inventoryMovementId?: Types.ObjectId; // movimiento IN de reingreso
}
const ReturnItemSchema = SchemaFactory.createForClass(ReturnItem);

/**
 * Documento de devolución. Registra qué se devolvió de una orden, cómo se
 * reembolsó y qué efectos colaterales generó (stock IN, salida de caja,
 * asiento contable, pagos marcados como reembolsados). Es la fuente de verdad
 * auditable del flujo de devoluciones. El servicio orquestador lo crea.
 *
 * Fase 0: devolución total con reembolso en efectivo. Los campos items[] y
 * refundMethod ya están modelados para que las fases parcial / saldo a favor /
 * cambio los extiendan sin migración.
 */
@Schema({ timestamps: true })
export class Return {
  // Único por tenant (no global): dos tenants pueden tener RET-2026-0001.
  // La unicidad la garantiza el índice compuesto { tenantId, returnNumber }.
  @Prop({ type: String, required: true })
  returnNumber: string;

  @Prop({ type: Types.ObjectId, ref: "Order", required: true })
  orderId: Types.ObjectId;

  @Prop({ type: String })
  orderNumber?: string;

  @Prop({ type: Types.ObjectId, ref: "Customer" })
  customerId?: Types.ObjectId;

  @Prop({ type: String })
  customerName?: string;

  @Prop({ type: [ReturnItemSchema], default: [] })
  items: ReturnItem[];

  @Prop({
    type: String,
    required: true,
    enum: ["cash", "store_credit", "original_method"],
    default: "cash",
  })
  refundMethod: string;

  @Prop({ type: Number, default: 0 })
  refundAmountUsd: number;

  @Prop({ type: Number, default: 0 })
  refundAmountVes: number;

  @Prop({ type: String, default: "USD" })
  currency: string;

  // true si la orden quedó con ítems sin devolver tras esta devolución.
  @Prop({ type: Boolean, default: false })
  isPartial: boolean;

  @Prop({ type: String })
  reason?: string;

  @Prop({
    type: String,
    required: true,
    enum: ["completed", "pending", "cancelled"],
    default: "completed",
  })
  status: string;

  // ---- Trazabilidad de efectos colaterales ----
  @Prop({ type: Types.ObjectId })
  cashSessionId?: Types.ObjectId; // sesión de caja de la que salió el efectivo

  @Prop({ type: Types.ObjectId, ref: "JournalEntry" })
  journalEntryId?: Types.ObjectId; // asiento contable del reembolso

  @Prop({ type: Types.ObjectId })
  storeCreditMovementId?: Types.ObjectId; // movimiento de saldo a favor (si aplica)

  @Prop({ type: [Types.ObjectId] })
  inventoryMovementIds?: Types.ObjectId[]; // movimientos IN de reingreso

  @Prop({ type: [Types.ObjectId] })
  refundedPaymentIds?: Types.ObjectId[]; // pagos marcados como refunded

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  tenantId: Types.ObjectId;
}

export const ReturnSchema = SchemaFactory.createForClass(Return);

// Un número de devolución es único por tenant; y consultamos por orden.
ReturnSchema.index({ tenantId: 1, returnNumber: 1 }, { unique: true });
ReturnSchema.index({ tenantId: 1, orderId: 1 });
