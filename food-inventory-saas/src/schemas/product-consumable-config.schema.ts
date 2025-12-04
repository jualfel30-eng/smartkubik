import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ProductConsumableConfigDocument = ProductConsumableConfig &
  Document;

/**
 * Custom conversion rule for specific product packaging
 * Overrides UnitType conversions when needed
 */
@Schema({ _id: false })
export class CustomConversionRule {
  @Prop({ type: String, required: true })
  unit: string; // "caja", "paquete"

  @Prop({ type: String, required: true })
  abbreviation: string; // "cj", "paq"

  @Prop({ type: Number, required: true, min: 0.0000001 })
  factor: number; // Factor específico del proveedor

  @Prop({
    type: String,
    enum: ["purchase", "stock", "consumption"],
    required: true,
  })
  context: string; // Cuándo aplicar esta conversión
}

export const CustomConversionRuleSchema =
  SchemaFactory.createForClass(CustomConversionRule);

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

  // ===== UNIT TYPE INTEGRATION =====

  @Prop({ type: Types.ObjectId, ref: "UnitType", required: false })
  unitTypeId?: Types.ObjectId; // Referencia al tipo de unidad global

  @Prop({ type: String, required: false })
  defaultUnit?: string; // Unidad base del producto (ej: "unidad", "ml")

  @Prop({ type: String, required: false })
  purchaseUnit?: string; // Unidad en que se compra (ej: "caja")

  @Prop({ type: String, required: false })
  stockUnit?: string; // Unidad en que se almacena (ej: "paquete")

  @Prop({ type: String, required: false })
  consumptionUnit?: string; // Unidad en que se consume (ej: "unidad")

  @Prop({ type: [CustomConversionRuleSchema], default: [] })
  customConversions?: CustomConversionRule[]; // Conversiones específicas del producto

  // ===== LEGACY FIELD (for backwards compatibility) =====

  @Prop({ type: String, required: false })
  unitOfMeasure?: string; // DEPRECATED: Usar defaultUnit en su lugar

  // ===== OTHER FIELDS =====

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
ProductConsumableConfigSchema.index({ unitTypeId: 1 }); // For UnitType queries
