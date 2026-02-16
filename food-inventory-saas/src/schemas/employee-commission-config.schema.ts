import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EmployeeCommissionConfigDocument = EmployeeCommissionConfig & Document;

/**
 * Override Tier - Tiers personalizados para un empleado
 */
@Schema()
export class OverrideTier {
  @Prop({ type: Number, required: true, min: 0 })
  from: number;

  @Prop({ type: Number, required: true })
  to: number;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  percentage: number;
}
const OverrideTierSchema = SchemaFactory.createForClass(OverrideTier);

/**
 * Employee Commission Config - Configuración de comisión específica por empleado
 *
 * Permite:
 * - Asignar un plan de comisión a un empleado
 * - Sobrescribir el porcentaje del plan con uno personalizado
 * - Definir tiers personalizados
 * - Establecer fechas de vigencia
 */
@Schema({ timestamps: true })
export class EmployeeCommissionConfig {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  employeeId: Types.ObjectId; // Puede ser User o EmployeeProfile según implementación

  @Prop({ type: Types.ObjectId, ref: "CommissionPlan", required: true })
  commissionPlanId: Types.ObjectId; // Plan asignado

  // ========================================
  // OVERRIDES INDIVIDUALES
  // ========================================

  @Prop({ type: Number, min: 0, max: 100 })
  overridePercentage?: number; // Porcentaje especial para este empleado

  @Prop({ type: Number, min: 0 })
  overrideFixedAmount?: number; // Monto fijo especial

  @Prop({ type: [OverrideTierSchema], default: [] })
  overrideTiers: OverrideTier[]; // Tiers personalizados (si vacío, usa los del plan)

  @Prop({ type: Number, min: 0 })
  overrideMaxCommission?: number; // Tope máximo personalizado

  // ========================================
  // VIGENCIA
  // ========================================

  @Prop({ type: Date, required: true, default: Date.now })
  effectiveDate: Date; // Desde cuándo aplica esta configuración

  @Prop({ type: Date })
  endDate?: Date; // Hasta cuándo aplica (null = indefinido)

  // ========================================
  // ESTADO
  // ========================================

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String, trim: true })
  notes?: string; // Notas internas sobre la configuración

  // ========================================
  // AUDITORÍA
  // ========================================

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const EmployeeCommissionConfigSchema = SchemaFactory.createForClass(
  EmployeeCommissionConfig
);

// ========================================
// ÍNDICES
// ========================================

// Búsqueda de configuración activa por empleado
EmployeeCommissionConfigSchema.index({
  tenantId: 1,
  employeeId: 1,
  isActive: 1,
});

// Verificar vigencia
EmployeeCommissionConfigSchema.index({
  tenantId: 1,
  employeeId: 1,
  effectiveDate: 1,
  endDate: 1,
});

// Por plan de comisión (para ver qué empleados tienen un plan)
EmployeeCommissionConfigSchema.index({
  tenantId: 1,
  commissionPlanId: 1,
  isActive: 1,
});

// Histórico por empleado
EmployeeCommissionConfigSchema.index({
  tenantId: 1,
  employeeId: 1,
  createdAt: -1,
});
