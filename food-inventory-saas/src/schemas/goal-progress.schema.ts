import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type GoalProgressDocument = GoalProgress & Document;

/**
 * Goal Contribution - Contribución individual a la meta
 */
@Schema()
export class GoalContribution {
  @Prop({ type: Types.ObjectId, ref: "Order", required: true })
  orderId: Types.ObjectId;

  @Prop({ type: String, required: true })
  orderNumber: string;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Number, required: true })
  amount: number; // Contribución a la meta ($ o unidades según targetType)

  @Prop({ type: Number })
  orderTotal?: number; // Monto total de la orden (para referencia)
}
const GoalContributionSchema = SchemaFactory.createForClass(GoalContribution);

/**
 * Goal Snapshot - Snapshot de la meta al momento de crear el progreso
 */
@Schema()
export class GoalSnapshot {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  targetType: string;

  @Prop({ type: Number, required: true })
  targetValue: number;

  @Prop({ type: String, required: true })
  bonusType: string;

  @Prop({ type: Number })
  bonusAmount?: number;

  @Prop({ type: Number })
  bonusPercentage?: number;

  @Prop({ type: Object })
  bonusTiers?: Array<{
    achievementPercentage: number;
    bonusAmount: number;
    label?: string;
  }>;
}
const GoalSnapshotSchema = SchemaFactory.createForClass(GoalSnapshot);

/**
 * Goal Progress - Progreso de un empleado hacia una meta
 *
 * Se crea automáticamente cuando:
 * - Inicia un nuevo período para una meta activa
 * - O cuando un empleado realiza su primera venta del período
 *
 * Estados:
 * - in_progress: Meta en progreso
 * - achieved: Meta alcanzada (100%+)
 * - failed: Período terminó sin alcanzar meta
 * - bonus_pending: Meta alcanzada, bono pendiente de aprobar
 * - bonus_awarded: Bono otorgado
 * - bonus_paid: Bono pagado en nómina
 */
@Schema({ timestamps: true })
export class GoalProgress {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "SalesGoal", required: true, index: true })
  goalId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  employeeId: Types.ObjectId;

  // ========================================
  // PERÍODO
  // ========================================

  @Prop({ type: Date, required: true })
  periodStart: Date;

  @Prop({ type: Date, required: true })
  periodEnd: Date;

  @Prop({ type: String, required: true })
  periodLabel: string; // "Enero 2024", "Semana 4", etc.

  // ========================================
  // PROGRESO
  // ========================================

  @Prop({ type: Number, required: true, default: 0 })
  currentValue: number; // Valor actual ($ vendidos, unidades, etc.)

  @Prop({ type: Number, required: true })
  targetValue: number; // Valor objetivo (snapshot del goal)

  @Prop({ type: Number, required: true, default: 0 })
  percentageComplete: number; // Porcentaje completado (0-100+)

  @Prop({ type: Number, default: 0 })
  ordersCount: number; // Número de órdenes que contribuyeron

  // ========================================
  // LOGRO
  // ========================================

  @Prop({ type: Boolean, default: false })
  achieved: boolean;

  @Prop({ type: Date })
  achievedAt?: Date;

  @Prop({ type: Number })
  finalAchievementPercentage?: number; // % final al cerrar período

  // ========================================
  // BONO
  // ========================================

  @Prop({ type: Boolean, default: false })
  bonusEligible: boolean; // ¿Califica para bono?

  @Prop({ type: Boolean, default: false })
  bonusAwarded: boolean;

  @Prop({ type: Number, default: 0 })
  bonusAmount: number; // Monto del bono calculado

  @Prop({ type: Types.ObjectId, ref: "BonusRecord" })
  bonusRecordId?: Types.ObjectId;

  @Prop({ type: String })
  bonusTierLabel?: string; // Etiqueta del tier alcanzado ("Meta", "Excelencia")

  // ========================================
  // ESTADO
  // ========================================

  @Prop({
    type: String,
    enum: [
      "in_progress",
      "achieved",
      "failed",
      "bonus_pending",
      "bonus_awarded",
      "bonus_paid",
    ],
    default: "in_progress",
    index: true,
  })
  status: string;

  // ========================================
  // DETALLE DE CONTRIBUCIONES
  // ========================================

  @Prop({ type: [GoalContributionSchema], default: [] })
  contributions: GoalContribution[];

  @Prop({ type: Number, default: 100 })
  maxContributionsStored: number; // Límite de contribuciones almacenadas

  // ========================================
  // SNAPSHOT DE LA META
  // ========================================

  @Prop({ type: GoalSnapshotSchema, required: true })
  goalSnapshot: GoalSnapshot;

  // ========================================
  // MILESTONES ALCANZADOS
  // ========================================

  @Prop({ type: [Number], default: [] })
  milestonesReached: number[]; // [50, 75, 90, 100] - milestones notificados

  // ========================================
  // METADATA
  // ========================================

  @Prop({ type: Date })
  lastUpdatedAt?: Date; // Última actualización del progreso

  @Prop({ type: String, trim: true })
  notes?: string;
}

export const GoalProgressSchema = SchemaFactory.createForClass(GoalProgress);

// ========================================
// ÍNDICES
// ========================================

// Progreso único por empleado/meta/período
GoalProgressSchema.index(
  { tenantId: 1, goalId: 1, employeeId: 1, periodStart: 1 },
  { unique: true }
);

// Progreso de un empleado en todos sus goals
GoalProgressSchema.index({
  tenantId: 1,
  employeeId: 1,
  periodStart: -1,
});

// Progresos por estado
GoalProgressSchema.index({
  tenantId: 1,
  status: 1,
  periodEnd: -1,
});

// Progresos activos (en progreso)
GoalProgressSchema.index({
  tenantId: 1,
  status: 1,
  periodStart: 1,
  periodEnd: 1,
});

// Progresos con bono pendiente
GoalProgressSchema.index({
  tenantId: 1,
  bonusEligible: 1,
  bonusAwarded: 1,
});

// Para dashboard de metas
GoalProgressSchema.index({
  tenantId: 1,
  goalId: 1,
  status: 1,
  percentageComplete: -1,
});

// Para cierre de períodos
GoalProgressSchema.index({
  tenantId: 1,
  periodEnd: 1,
  status: 1,
});
