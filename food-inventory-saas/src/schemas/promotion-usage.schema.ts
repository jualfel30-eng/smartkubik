import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PromotionUsageDocument = PromotionUsage & Document;

@Schema({ timestamps: true })
export class PromotionUsage {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Promotion", required: true, index: true })
  promotionId: Types.ObjectId;

  @Prop({ type: String, required: true })
  promotionName: string; // Desnormalizado para reportes

  @Prop({ type: Types.ObjectId, ref: "Customer", index: true })
  customerId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Order", required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  orderAmount: number; // Monto de la orden antes del descuento

  @Prop({ type: Number, required: true })
  discountAmount: number; // Descuento aplicado

  @Prop({ type: Number, required: true })
  finalAmount: number; // Monto final después del descuento

  @Prop({ type: Date, default: Date.now })
  appliedAt: Date;

  @Prop({ type: Object })
  metadata?: {
    promotionType?: string;
    productsAffected?: string[];
    quantityAffected?: number;
    [key: string]: any;
  };
}

export const PromotionUsageSchema =
  SchemaFactory.createForClass(PromotionUsage);

// Índices
PromotionUsageSchema.index({ tenantId: 1, promotionId: 1, customerId: 1 });
PromotionUsageSchema.index({ tenantId: 1, promotionId: 1, appliedAt: -1 });
PromotionUsageSchema.index({ tenantId: 1, customerId: 1, appliedAt: -1 });
PromotionUsageSchema.index({ tenantId: 1, orderId: 1 });
