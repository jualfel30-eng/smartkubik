import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type SalesGoalDocument = SalesGoal & Document;

/**
 * Bonus Tier - Bonos escalonados por nivel de logro
 * Ejemplo: 100% = $100, 110% = $150, 120% = $200
 */
@Schema()
export class BonusTier {
  @Prop({ type: Number, required: true, min: 0 })
  achievementPercentage: number; // Porcentaje de logro (100 = meta, 110 = 10% extra)

  @Prop({ type: Number, required: true, min: 0 })
  bonusAmount: number; // Bono en este nivel

  @Prop({ type: String, trim: true })
  label?: string; // Etiqueta: "Meta", "Superación", "Excelencia"
}
const BonusTierSchema = SchemaFactory.createForClass(BonusTier);

/**
 * Sales Goal - Meta de ventas
 *
 * Tipos de meta:
 * - amount: Monto en ventas ($)
 * - units: Unidades vendidas
 * - orders: Número de órdenes
 * - margin: Margen de ganancia ($)
 *
 * Tipos de aplicabilidad:
 * - all: Aplica a todos los empleados elegibles
 * - role: Aplica a empleados de ciertos roles
 * - individual: Aplica a empleados específicos
 * - team: Aplica a un equipo completo (meta grupal)
 *
 * Tipos de bono:
 * - fixed: Monto fijo al alcanzar la meta
 * - percentage: Porcentaje del valor de la meta
 * - tiered: Bonos escalonados según nivel de logro
 */
@Schema({ timestamps: true })
export class SalesGoal {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string; // "Meta Mensual $10,000"

  @Prop({ type: String, trim: true })
  description?: string;

  // ========================================
  // TIPO Y VALOR DE LA META
  // ========================================

  @Prop({
    type: String,
    enum: ["amount", "units", "orders", "margin"],
    required: true,
    default: "amount",
  })
  targetType: string;

  @Prop({ type: Number, required: true, min: 0 })
  targetValue: number; // Valor objetivo

  @Prop({ type: String, default: "USD" })
  currency?: string; // Moneda (para type=amount o margin)

  // ========================================
  // PERÍODO
  // ========================================

  @Prop({
    type: String,
    enum: ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly", "custom"],
    required: true,
    default: "monthly",
  })
  periodType: string;

  // Para períodos custom
  @Prop({ type: Date })
  customPeriodStart?: Date;

  @Prop({ type: Date })
  customPeriodEnd?: Date;

  @Prop({ type: Boolean, default: true })
  isRecurring: boolean; // ¿Se repite cada período?

  // ========================================
  // APLICABILIDAD
  // ========================================

  @Prop({
    type: String,
    enum: ["all", "role", "individual", "team"],
    required: true,
    default: "all",
  })
  applicableTo: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: "User" }], default: [] })
  employeeIds: Types.ObjectId[]; // Si applicableTo = "individual"

  @Prop({ type: [{ type: Types.ObjectId, ref: "Role" }], default: [] })
  roleIds: Types.ObjectId[]; // Si applicableTo = "role"

  @Prop({ type: Types.ObjectId, ref: "Team" })
  teamId?: Types.ObjectId; // Si applicableTo = "team"

  // ========================================
  // FILTROS DE PRODUCTOS (opcional)
  // ========================================

  @Prop({ type: [{ type: Types.ObjectId, ref: "Product" }], default: [] })
  applicableProducts: Types.ObjectId[]; // Solo ventas de estos productos cuentan

  @Prop({ type: [String], default: [] })
  applicableCategories: string[]; // Solo ventas de estas categorías cuentan

  // ========================================
  // BONIFICACIÓN
  // ========================================

  @Prop({
    type: String,
    enum: ["fixed", "percentage", "tiered", "none"],
    required: true,
    default: "fixed",
  })
  bonusType: string;

  @Prop({ type: Number, min: 0, default: 0 })
  bonusAmount: number; // Si bonusType = "fixed"

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  bonusPercentage: number; // Si bonusType = "percentage" (% sobre el targetValue)

  @Prop({ type: [BonusTierSchema], default: [] })
  bonusTiers: BonusTier[]; // Si bonusType = "tiered"

  @Prop({ type: Boolean, default: false })
  bonusProRated: boolean; // ¿Bono proporcional al logro parcial?

  @Prop({ type: Number, min: 0, max: 100, default: 100 })
  minAchievementForBonus: number; // % mínimo para recibir bono (default 100%)

  // ========================================
  // ESTADO
  // ========================================

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date })
  activatedAt?: Date;

  @Prop({ type: Date })
  deactivatedAt?: Date;

  // ========================================
  // NOTIFICACIONES
  // ========================================

  @Prop({ type: Boolean, default: true })
  notifyOnAchievement: boolean; // Notificar cuando se alcance

  @Prop({ type: [Number], default: [50, 75, 90] })
  progressMilestones: number[]; // Notificar en estos % de progreso

  // ========================================
  // AUDITORÍA
  // ========================================

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const SalesGoalSchema = SchemaFactory.createForClass(SalesGoal);

// ========================================
// ÍNDICES
// ========================================

// Metas activas por tenant
SalesGoalSchema.index({ tenantId: 1, isActive: 1 });

// Metas por tipo de período
SalesGoalSchema.index({ tenantId: 1, periodType: 1, isActive: 1 });

// Metas por aplicabilidad
SalesGoalSchema.index({ tenantId: 1, applicableTo: 1, isActive: 1 });

// Metas por roles
SalesGoalSchema.index({ tenantId: 1, roleIds: 1, isActive: 1 });

// Metas por empleados específicos
SalesGoalSchema.index({ tenantId: 1, employeeIds: 1, isActive: 1 });

// Ordenamiento por fecha
SalesGoalSchema.index({ tenantId: 1, createdAt: -1 });
