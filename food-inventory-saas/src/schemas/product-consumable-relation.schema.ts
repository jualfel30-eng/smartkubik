import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ProductConsumableRelationDocument = ProductConsumableRelation &
  Document;

@Schema({ timestamps: true })
export class ProductConsumableRelation {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId; // El producto que requiere consumibles (ej: una bebida)

  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  consumableId: Types.ObjectId; // El producto consumible (ej: un vaso)

  @Prop({ type: Number, required: true, default: 1 })
  quantityRequired: number; // Cantidad del consumible requerido por unidad del producto

  @Prop({ type: Boolean, default: true })
  isRequired: boolean; // Si es obligatorio o opcional

  @Prop({ type: Boolean, default: true })
  isAutoDeducted: boolean; // Si se deduce automáticamente al vender el producto

  @Prop({ type: Number, default: 0 })
  priority: number; // Prioridad de uso (0 = más alta)

  @Prop({
    type: String,
    enum: ["always", "takeaway", "dine_in", "delivery"],
    default: "always",
  })
  applicableContext: string; // Cuándo se aplica este consumible

  @Prop({ type: String })
  notes?: string; // Notas adicionales

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const ProductConsumableRelationSchema = SchemaFactory.createForClass(
  ProductConsumableRelation,
);

// Índices
ProductConsumableRelationSchema.index(
  { productId: 1, consumableId: 1, tenantId: 1 },
  { unique: true },
);
ProductConsumableRelationSchema.index({
  tenantId: 1,
  productId: 1,
  isActive: 1,
});
ProductConsumableRelationSchema.index({ tenantId: 1, consumableId: 1 });
ProductConsumableRelationSchema.index({ tenantId: 1, isAutoDeducted: 1 });
ProductConsumableRelationSchema.index({ tenantId: 1, applicableContext: 1 });
