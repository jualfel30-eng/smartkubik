import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type BonusRecordDocument = BonusRecord & Document;

/**
 * Bonus Record - Registro individual de bono
 *
 * Tipos de bono:
 * - goal_achievement: Bono por alcanzar meta de ventas
 * - special: Bono especial/discrecional
 * - retention: Bono de retención
 * - performance: Bono por desempeño
 * - referral: Bono por referido
 * - signing: Bono de firma/contratación
 * - holiday: Bono de festividad
 * - profit_sharing: Participación en utilidades
 *
 * Estados:
 * - pending: Creado, pendiente de aprobación
 * - approved: Aprobado, listo para nómina
 * - rejected: Rechazado
 * - paid: Pagado en nómina
 * - cancelled: Cancelado
 */
@Schema({ timestamps: true })
export class BonusRecord {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  employeeId: Types.ObjectId;

  // ========================================
  // TIPO Y ORIGEN
  // ========================================

  @Prop({
    type: String,
    enum: [
      "goal_achievement",
      "special",
      "retention",
      "performance",
      "referral",
      "signing",
      "holiday",
      "profit_sharing",
      "other",
    ],
    required: true,
    default: "special",
  })
  type: string;

  // Origen del bono (si viene de una meta)
  @Prop({ type: Types.ObjectId, ref: "SalesGoal" })
  sourceGoalId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "GoalProgress" })
  sourceGoalProgressId?: Types.ObjectId;

  @Prop({ type: String })
  sourceGoalName?: string; // Desnormalizado para historial

  // ========================================
  // MONTO Y DESCRIPCIÓN
  // ========================================

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: String, default: "USD" })
  currency: string;

  @Prop({ type: String, required: true, trim: true })
  description: string; // "Bono por alcanzar meta mensual Enero 2024"

  @Prop({ type: String, trim: true })
  internalNotes?: string; // Notas internas (no visibles al empleado)

  // ========================================
  // PERÍODO DE REFERENCIA
  // ========================================

  @Prop({ type: Date })
  periodStart?: Date; // Período al que corresponde el bono

  @Prop({ type: Date })
  periodEnd?: Date;

  @Prop({ type: String })
  periodLabel?: string; // "Enero 2024", "Q1 2024"

  // ========================================
  // ESTADO Y WORKFLOW
  // ========================================

  @Prop({
    type: String,
    enum: ["pending", "approved", "rejected", "paid", "cancelled"],
    default: "pending",
    index: true,
  })
  status: string;

  // Aprobación
  @Prop({ type: Types.ObjectId, ref: "User" })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt?: Date;

  // Rechazo
  @Prop({ type: Types.ObjectId, ref: "User" })
  rejectedBy?: Types.ObjectId;

  @Prop({ type: Date })
  rejectedAt?: Date;

  @Prop({ type: String, trim: true })
  rejectionReason?: string;

  // Cancelación
  @Prop({ type: Types.ObjectId, ref: "User" })
  cancelledBy?: Types.ObjectId;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: String, trim: true })
  cancellationReason?: string;

  // ========================================
  // INTEGRACIÓN CONTABLE
  // ========================================

  @Prop({ type: Types.ObjectId, ref: "JournalEntry" })
  journalEntryId?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  journalEntryCreated: boolean;

  // ========================================
  // INTEGRACIÓN NÓMINA
  // ========================================

  @Prop({ type: Types.ObjectId, ref: "PayrollRun" })
  payrollRunId?: Types.ObjectId;

  @Prop({ type: Date })
  paidAt?: Date;

  @Prop({ type: String })
  payrollPeriodLabel?: string; // Período de nómina donde se pagó

  // ========================================
  // IMPUESTOS (para referencia)
  // ========================================

  @Prop({ type: Boolean, default: true })
  isTaxable: boolean; // ¿Sujeto a impuestos?

  @Prop({ type: Number })
  estimatedTaxWithholding?: number; // Retención estimada

  // ========================================
  // AUDITORÍA
  // ========================================

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;

  // ========================================
  // METADATA
  // ========================================

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Datos adicionales flexibles
}

export const BonusRecordSchema = SchemaFactory.createForClass(BonusRecord);

// ========================================
// ÍNDICES
// ========================================

// Bonos por empleado
BonusRecordSchema.index({
  tenantId: 1,
  employeeId: 1,
  createdAt: -1,
});

// Bonos pendientes de aprobación
BonusRecordSchema.index({
  tenantId: 1,
  status: 1,
  createdAt: -1,
});

// Bonos aprobados pendientes de pago
BonusRecordSchema.index({
  tenantId: 1,
  status: 1,
  payrollRunId: 1,
});

// Bonos por tipo
BonusRecordSchema.index({
  tenantId: 1,
  type: 1,
  status: 1,
});

// Bonos por período
BonusRecordSchema.index({
  tenantId: 1,
  periodStart: 1,
  periodEnd: 1,
});

// Bonos de metas (para evitar duplicados)
BonusRecordSchema.index({
  tenantId: 1,
  sourceGoalProgressId: 1,
  type: 1,
});

// Para reportes de nómina
BonusRecordSchema.index({
  tenantId: 1,
  payrollRunId: 1,
});
