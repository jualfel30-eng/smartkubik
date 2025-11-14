import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ProductConsumableConfigDocument = ProductConsumableConfig &
  Document;

@Schema({ timestamps: true })
export class ProductConsumableConfig {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  consumableType: string; // "container", "packaging", "utensil", "wrapper", "bag", "box", "cup", "lid", etc.

  @Prop({ type: Boolean, default: false })
  isReusable: boolean;

  @Prop({ type: Boolean, default: true })
  isAutoDeducted: boolean; // Si se deduce automáticamente al vender productos relacionados

  @Prop({ type: Number, default: 1 })
  defaultQuantityPerUse: number; // Cantidad que se consume por uso (ej: 1 vaso por bebida)

  @Prop({ type: String })
  unitOfMeasure: string; // "unidad", "gramo", "ml", etc.

  @Prop({ type: String, required: false })
  notes?: string; // Notas adicionales sobre el consumible

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>; // Campos personalizables

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const ProductConsumableConfigSchema = SchemaFactory.createForClass(
  ProductConsumableConfig,
);

// Índices
ProductConsumableConfigSchema.index(
  { productId: 1, tenantId: 1 },
  { unique: true },
);
ProductConsumableConfigSchema.index({ tenantId: 1, consumableType: 1 });
ProductConsumableConfigSchema.index({ tenantId: 1, isActive: 1 });
ProductConsumableConfigSchema.index({ tenantId: 1, isAutoDeducted: 1 });
