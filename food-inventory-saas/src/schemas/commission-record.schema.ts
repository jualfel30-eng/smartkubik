import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CommissionRecordDocument = CommissionRecord & Document;

/**
 * Tier Applied - Información del tier que se aplicó (si aplica)
 */
@Schema()
export class TierApplied {
  @Prop({ type: Number, required: true })
  from: number;

  @Prop({ type: Number, required: true })
  to: number;

  @Prop({ type: Number, required: true })
  percentage: number;
}
const TierAppliedSchema = SchemaFactory.createForClass(TierApplied);

/**
 * Commission Record - Registro individual de comisión por venta
 *
 * Se crea automáticamente cuando:
 * - Una orden se marca como completada/pagada
 * - La orden tiene un vendedor asignado (salesPersonId)
 * - El vendedor tiene un plan de comisión activo
 *
 * Estados:
 * - pending: Calculada, pendiente de aprobación
 * - approved: Aprobada, lista para incluir en nómina
 * - rejected: Rechazada por alguna razón
 * - paid: Pagada en nómina
 */
@Schema({ timestamps: true })
export class CommissionRecord {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Order", required: true, index: true })
  orderId: Types.ObjectId;

  // ========================================
  // DATOS DE LA ORDEN (desnormalizados para reportes)
  // ========================================

  @Prop({ type: String, required: true })
  orderNumber: string;

  @Prop({ type: Date, required: true })
  orderDate: Date;

  @Prop({ type: Number, required: true })
  orderTotalAmount: number; // Monto total de la orden

  @Prop({ type: Number, required: true })
  orderSubtotal: number; // Subtotal sin impuestos

  @Prop({ type: Number, default: 0 })
  orderDiscountAmount: number; // Descuentos aplicados

  @Prop({ type: Number, required: true })
  commissionBaseAmount: number; // Monto sobre el cual se calculó la comisión

  // ========================================
  // CÁLCULO DE COMISIÓN
  // ========================================

  @Prop({ type: Types.ObjectId, ref: "CommissionPlan", required: true })
  commissionPlanId: Types.ObjectId;

  @Prop({ type: String, required: true })
  commissionPlanName: string; // Desnormalizado para historial

  @Prop({
    type: String,
    enum: ["percentage", "tiered", "fixed", "mixed"],
    required: true,
  })
  commissionType: string;

  @Prop({ type: Number, required: true, min: 0 })
  commissionPercentage: number; // Porcentaje aplicado (0 si fue fixed)

  @Prop({ type: Number, required: true, min: 0 })
  commissionAmount: number; // Monto final de comisión

  @Prop({ type: TierAppliedSchema })
  tierApplied?: TierApplied; // Si se usó un tier, cuál fue

  @Prop({ type: Boolean, default: false })
  wasOverridden: boolean; // Si se usó override del empleado

  @Prop({ type: Boolean, default: false })
  wasCapped: boolean; // Si se aplicó tope máximo

  @Prop({ type: Number })
  originalAmount?: number; // Monto antes del tope (si se aplicó)

  // ========================================
  // ESTADO Y WORKFLOW
  // ========================================

  @Prop({
    type: String,
    enum: ["pending", "approved", "rejected", "paid"],
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

  // ========================================
  // INTEGRACIÓN CONTABLE
  // ========================================

  @Prop({ type: Types.ObjectId, ref: "JournalEntry" })
  journalEntryId?: Types.ObjectId; // Asiento contable generado

  @Prop({ type: Boolean, default: false })
  journalEntryCreated: boolean;

  // ========================================
  // INTEGRACIÓN NÓMINA
  // ========================================

  @Prop({ type: Types.ObjectId, ref: "PayrollRun" })
  payrollRunId?: Types.ObjectId; // Nómina donde se incluyó

  @Prop({ type: Date })
  paidAt?: Date;

  // ========================================
  // METADATA
  // ========================================

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Datos adicionales flexibles
}

export const CommissionRecordSchema = SchemaFactory.createForClass(CommissionRecord);

// ========================================
// ÍNDICES
// ========================================

// Evitar duplicados: una comisión por orden por empleado
CommissionRecordSchema.index(
  { tenantId: 1, orderId: 1, employeeId: 1 },
  { unique: true }
);

// Comisiones pendientes de aprobación
CommissionRecordSchema.index({
  tenantId: 1,
  status: 1,
  createdAt: -1,
});

// Comisiones por empleado en un período
CommissionRecordSchema.index({
  tenantId: 1,
  employeeId: 1,
  orderDate: -1,
});

// Comisiones aprobadas pendientes de pago
CommissionRecordSchema.index({
  tenantId: 1,
  status: 1,
  payrollRunId: 1,
});

// Para reportes por período
CommissionRecordSchema.index({
  tenantId: 1,
  orderDate: 1,
  status: 1,
});

// Por plan de comisión (análisis)
CommissionRecordSchema.index({
  tenantId: 1,
  commissionPlanId: 1,
  orderDate: -1,
});
