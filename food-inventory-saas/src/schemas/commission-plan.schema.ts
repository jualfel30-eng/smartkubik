import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CommissionPlanDocument = CommissionPlan & Document;

/**
 * Commission Tier - Para comisiones escalonadas
 * Ejemplo: 0-10000 = 3%, 10001-20000 = 5%, 20001+ = 7%
 */
@Schema()
export class CommissionTier {
  @Prop({ type: Number, required: true, min: 0 })
  from: number; // Desde (inclusive)

  @Prop({ type: Number, required: true })
  to: number; // Hasta (inclusive), usar Infinity para "sin límite"

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  percentage: number; // Porcentaje de comisión
}
const CommissionTierSchema = SchemaFactory.createForClass(CommissionTier);

/**
 * Commission Plan - Plan de comisiones para vendedores
 *
 * Tipos:
 * - percentage: Porcentaje fijo sobre todas las ventas
 * - tiered: Porcentaje escalonado según monto de venta
 * - fixed: Monto fijo por venta
 * - mixed: Combinación de fijo + porcentaje
 */
@Schema({ timestamps: true })
export class CommissionPlan {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string; // "Plan Vendedores Senior", "Plan Básico"

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: ["percentage", "tiered", "fixed", "mixed"],
    required: true,
    default: "percentage",
  })
  type: string;

  // ========================================
  // CONFIGURACIÓN DE COMISIÓN
  // ========================================

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  defaultPercentage: number; // Porcentaje base (para type=percentage o mixed)

  @Prop({ type: Number, min: 0, default: 0 })
  fixedAmount: number; // Monto fijo por venta (para type=fixed o mixed)

  @Prop({ type: [CommissionTierSchema], default: [] })
  tiers: CommissionTier[]; // Tiers para type=tiered

  // ========================================
  // APLICABILIDAD
  // ========================================

  @Prop({ type: [{ type: Types.ObjectId, ref: "Role" }], default: [] })
  applicableRoles: Types.ObjectId[]; // Roles que pueden usar este plan

  @Prop({ type: [{ type: Types.ObjectId, ref: "Product" }], default: [] })
  applicableProducts: Types.ObjectId[]; // Productos específicos (vacío = todos)

  @Prop({ type: [String], default: [] })
  applicableCategories: string[]; // Categorías específicas (vacío = todas)

  // ========================================
  // CONFIGURACIÓN DE CÁLCULO
  // ========================================

  @Prop({ type: Boolean, default: true })
  calculateOnDiscountedAmount: boolean; // ¿Calcular sobre monto con descuento?

  @Prop({ type: Boolean, default: false })
  includeTaxesInBase: boolean; // ¿Incluir impuestos en la base de cálculo?

  @Prop({ type: Boolean, default: false })
  includeShippingInBase: boolean; // ¿Incluir envío en la base de cálculo?

  @Prop({ type: Number, min: 0, default: 0 })
  minOrderAmount: number; // Monto mínimo de orden para generar comisión

  @Prop({ type: Number, min: 0 })
  maxCommissionAmount?: number; // Tope máximo de comisión por venta

  // ========================================
  // ESTADO Y DEFAULTS
  // ========================================

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isDefault: boolean; // Plan por defecto del tenant (solo uno puede ser default)

  // ========================================
  // AUDITORÍA
  // ========================================

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const CommissionPlanSchema = SchemaFactory.createForClass(CommissionPlan);

// ========================================
// ÍNDICES
// ========================================

// Búsqueda por tenant
CommissionPlanSchema.index({ tenantId: 1, isActive: 1 });

// Plan default del tenant (solo uno)
CommissionPlanSchema.index({ tenantId: 1, isDefault: 1 });

// Búsqueda por roles aplicables
CommissionPlanSchema.index({ tenantId: 1, applicableRoles: 1 });

// Ordenamiento por fecha de creación
CommissionPlanSchema.index({ tenantId: 1, createdAt: -1 });
