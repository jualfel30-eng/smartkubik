import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import {
  CustomConversionRule,
  CustomConversionRuleSchema,
} from "./product-consumable-config.schema";

export type ProductSupplyConfigDocument = ProductSupplyConfig & Document;

@Schema({ timestamps: true })
export class ProductSupplyConfig {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  supplyCategory: string; // "cleaning", "office", "maintenance", "safety", "kitchen", etc.

  @Prop({ type: String, required: true })
  supplySubcategory: string; // "detergent", "paper", "tools", "gloves", "utensils", etc.

  @Prop({ type: Boolean, default: false })
  requiresTracking: boolean; // Si requiere seguimiento de uso/consumo

  @Prop({ type: Boolean, default: false })
  requiresAuthorization: boolean; // Si requiere autorización para su uso

  @Prop({ type: String })
  usageDepartment?: string; // "kitchen", "cleaning", "admin", "maintenance", etc.

  @Prop({ type: Number })
  estimatedMonthlyConsumption?: number; // Consumo mensual estimado

  // ===== UNIT TYPE INTEGRATION =====

  @Prop({ type: Types.ObjectId, ref: "UnitType", required: false })
  unitTypeId?: Types.ObjectId; // Referencia al tipo de unidad global

  @Prop({ type: String, required: false })
  defaultUnit?: string; // Unidad base del producto (ej: "litro", "unidad")

  @Prop({ type: String, required: false })
  purchaseUnit?: string; // Unidad en que se compra (ej: "garrafa", "caja")

  @Prop({ type: String, required: false })
  stockUnit?: string; // Unidad en que se almacena (ej: "litro", "paquete")

  @Prop({ type: String, required: false })
  consumptionUnit?: string; // Unidad en que se consume (ej: "ml", "unidad")

  @Prop({ type: [CustomConversionRuleSchema], default: [] })
  customConversions?: CustomConversionRule[]; // Conversiones específicas del producto

  // ===== LEGACY FIELD (for backwards compatibility) =====

  @Prop({ type: String, required: false })
  unitOfMeasure?: string; // DEPRECATED: Usar defaultUnit en su lugar

  // ===== OTHER FIELDS =====

  @Prop({ type: Object })
  safetyInfo?: {
    requiresPPE: boolean; // Requiere equipo de protección personal
    isHazardous: boolean; // Es material peligroso
    storageRequirements?: string; // Requisitos especiales de almacenamiento
    handlingInstructions?: string; // Instrucciones de manejo
  };

  @Prop({ type: String, required: false })
  notes?: string; // Notas adicionales

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

export const ProductSupplyConfigSchema =
  SchemaFactory.createForClass(ProductSupplyConfig);

// Índices
ProductSupplyConfigSchema.index(
  { productId: 1, tenantId: 1 },
  { unique: true },
);
ProductSupplyConfigSchema.index({ tenantId: 1, supplyCategory: 1 });
ProductSupplyConfigSchema.index({ tenantId: 1, supplySubcategory: 1 });
ProductSupplyConfigSchema.index({ tenantId: 1, isActive: 1 });
ProductSupplyConfigSchema.index({ tenantId: 1, requiresTracking: 1 });
ProductSupplyConfigSchema.index({ tenantId: 1, usageDepartment: 1 });
ProductSupplyConfigSchema.index({ unitTypeId: 1 }); // For UnitType queries
