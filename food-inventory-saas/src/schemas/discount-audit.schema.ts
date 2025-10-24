import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type DiscountAuditDocument = DiscountAudit & Document;

@Schema({ timestamps: true })
export class DiscountAudit {
  @Prop({ type: String, required: true, enum: ["order", "order_item", "product"] })
  discountType: string; // Tipo de descuento: en orden completa, item específico, o producto

  @Prop({ type: Types.ObjectId, ref: "Order" })
  orderId?: Types.ObjectId;

  @Prop({ type: String })
  orderNumber?: string;

  @Prop({ type: Types.ObjectId, ref: "Product" })
  productId?: Types.ObjectId;

  @Prop({ type: String })
  productSku?: string;

  @Prop({ type: String })
  productName?: string;

  @Prop({ type: Number, required: true })
  originalAmount: number; // Monto original antes del descuento

  @Prop({ type: Number, required: true })
  discountPercentage: number; // Porcentaje de descuento aplicado

  @Prop({ type: Number, required: true })
  discountAmount: number; // Monto de descuento

  @Prop({ type: Number, required: true })
  finalAmount: number; // Monto final después del descuento

  @Prop({ type: String, required: true })
  reason: string; // Razón del descuento

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  appliedBy: Types.ObjectId; // Usuario que aplicó el descuento

  @Prop({ type: String, required: true })
  appliedByName: string; // Nombre del usuario que aplicó el descuento

  @Prop({ type: Types.ObjectId, ref: "User" })
  approvedBy?: Types.ObjectId; // Usuario que aprobó el descuento (si es diferente)

  @Prop({ type: String })
  approvedByName?: string; // Nombre del usuario que aprobó

  @Prop({ type: Types.ObjectId, ref: "Customer" })
  customerId?: Types.ObjectId;

  @Prop({ type: String })
  customerName?: string;

  @Prop({ type: Number })
  quantity?: number; // Cantidad de productos (para descuentos por volumen)

  @Prop({ type: Boolean, default: false })
  wasBulkDiscount: boolean; // Si fue un descuento automático por volumen

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Datos adicionales (ej: reglas de descuento aplicadas)

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

export const DiscountAuditSchema = SchemaFactory.createForClass(DiscountAudit);

// Índices para optimizar consultas
DiscountAuditSchema.index({ tenantId: 1, createdAt: -1 });
DiscountAuditSchema.index({ orderId: 1, tenantId: 1 });
DiscountAuditSchema.index({ productId: 1, tenantId: 1 });
DiscountAuditSchema.index({ appliedBy: 1, tenantId: 1 });
DiscountAuditSchema.index({ customerId: 1, tenantId: 1 });
DiscountAuditSchema.index({ discountType: 1, createdAt: -1, tenantId: 1 });
