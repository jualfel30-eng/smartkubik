import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CouponUsageDocument = CouponUsage & Document;

@Schema({ timestamps: true })
export class CouponUsage {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Coupon", required: true, index: true })
  couponId: Types.ObjectId;

  @Prop({ type: String, required: true })
  couponCode: string; // Código del cupón (desnormalizado para reportes)

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Order", required: true })
  orderId: Types.ObjectId; // Orden donde se usó el cupón

  @Prop({ type: Number, required: true })
  orderAmount: number; // Monto de la orden

  @Prop({ type: Number, required: true })
  discountAmount: number; // Descuento aplicado

  @Prop({ type: Date, default: Date.now })
  usedAt: Date; // Fecha de uso

  @Prop({ type: Object })
  metadata?: {
    discountType?: string;
    discountValue?: number;
    [key: string]: any;
  };
}

export const CouponUsageSchema = SchemaFactory.createForClass(CouponUsage);

// Índices compuestos
CouponUsageSchema.index({ tenantId: 1, couponId: 1, customerId: 1 }); // Para contar usos por cliente
CouponUsageSchema.index({ tenantId: 1, couponId: 1, usedAt: -1 }); // Para reportes de uso
CouponUsageSchema.index({ tenantId: 1, customerId: 1, usedAt: -1 }); // Para historial del cliente
