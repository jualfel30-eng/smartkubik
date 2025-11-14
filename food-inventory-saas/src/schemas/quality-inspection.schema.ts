import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type QualityInspectionDocument = QualityInspection & Document;
export type NonConformanceDocument = NonConformance & Document;

/**
 * Inspection Result - Resultado de un checkpoint individual
 */
@Schema()
export class InspectionResult {
  readonly _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  checkpointId: Types.ObjectId; // Referencia al checkpoint del plan

  @Prop({ type: String, required: true })
  checkpointName: string; // Nombre del checkpoint (copiado para histórico)

  @Prop({ type: String })
  measuredValue?: string; // Valor medido como string

  @Prop({ type: Number })
  numericValue?: number; // Valor numérico si aplica

  @Prop({ type: String })
  expectedValue?: string; // Valor esperado (copiado del plan)

  @Prop({ type: Boolean, required: true })
  passed: boolean; // Si pasó la inspección

  @Prop({ type: String })
  notes?: string; // Observaciones

  @Prop({ type: Date, default: Date.now })
  inspectedAt: Date;
}

export const InspectionResultSchema =
  SchemaFactory.createForClass(InspectionResult);

/**
 * Quality Inspection - Inspección de Calidad
 * Registro de una inspección realizada sobre un lote/producto
 */
@Schema({ timestamps: true })
export class QualityInspection {
  @Prop({ type: String, required: true, unique: true })
  inspectionNumber: string; // INS-2024-001

  @Prop({ type: Types.ObjectId, ref: "QualityControlPlan", required: true })
  qcPlanId: Types.ObjectId;

  @Prop({ type: String, required: true })
  qcPlanName: string; // Nombre del plan (copiado)

  @Prop({
    type: String,
    enum: ["receiving", "in_process", "final_inspection"],
    required: true,
  })
  inspectionType: string;

  @Prop({
    type: String,
    enum: ["pending", "in_progress", "completed", "cancelled"],
    default: "pending",
  })
  status: string;

  // Producto/Lote inspeccionado
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String })
  productSku?: string;

  @Prop({ type: String })
  lotNumber?: string; // Lote inspeccionado

  @Prop({ type: Number, required: true })
  quantity: number; // Cantidad inspeccionada

  @Prop({ type: String, required: true })
  unit: string;

  // Referencia a orden de manufactura si aplica
  @Prop({ type: Types.ObjectId, ref: "ManufacturingOrder" })
  manufacturingOrderId?: Types.ObjectId;

  // Inspector
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  inspector: Types.ObjectId;

  @Prop({ type: String })
  inspectorName?: string;

  @Prop({ type: Date })
  inspectionDate: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  // Resultados
  @Prop({ type: [InspectionResultSchema], default: [] })
  results: InspectionResult[];

  @Prop({ type: Boolean })
  overallResult?: boolean; // true = passed, false = failed

  @Prop({ type: Number, default: 0 })
  passedCheckpoints: number;

  @Prop({ type: Number, default: 0 })
  failedCheckpoints: number;

  @Prop({ type: Number, default: 0 })
  totalCheckpoints: number;

  // No conformidades generadas
  @Prop({ type: [{ type: Types.ObjectId, ref: "NonConformance" }], default: [] })
  nonConformances: Types.ObjectId[];

  // Attachments (fotos, documentos)
  @Prop({ type: [String], default: [] })
  attachments: string[]; // URLs a fotos, PDFs, etc.

  @Prop({ type: String })
  generalNotes?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const QualityInspectionSchema =
  SchemaFactory.createForClass(QualityInspection);

/**
 * Non-Conformance - No Conformidad
 * Registro de problemas de calidad y acciones correctivas
 */
@Schema({ timestamps: true })
export class NonConformance {
  @Prop({ type: String, required: true, unique: true })
  ncNumber: string; // NC-2024-001

  @Prop({ type: Types.ObjectId, ref: "QualityInspection" })
  inspectionId?: Types.ObjectId; // Inspección que la generó

  @Prop({
    type: String,
    enum: ["quality_defect", "process_deviation", "documentation", "other"],
    required: true,
  })
  type: string;

  @Prop({ type: String, enum: ["minor", "major", "critical"], required: true })
  severity: string;

  @Prop({ type: String, required: true })
  description: string;

  // Producto/Lote afectado
  @Prop({ type: Types.ObjectId, ref: "Product" })
  productId?: Types.ObjectId;

  @Prop({ type: String })
  productName?: string;

  @Prop({ type: String })
  lotNumber?: string;

  @Prop({ type: Number })
  affectedQuantity?: number;

  @Prop({ type: String })
  unit?: string;

  // Análisis de causa raíz
  @Prop({ type: String })
  rootCause?: string;

  // Acciones correctivas
  @Prop({ type: String })
  correctiveAction?: string;

  @Prop({ type: String })
  preventiveAction?: string;

  // Responsables
  @Prop({ type: Types.ObjectId, ref: "User" })
  responsibleUserId?: Types.ObjectId;

  @Prop({ type: String })
  responsibleUserName?: string;

  @Prop({ type: Date })
  dueDate?: Date;

  // Estado
  @Prop({
    type: String,
    enum: ["open", "in_progress", "verification", "closed", "cancelled"],
    default: "open",
  })
  status: string;

  @Prop({ type: Date })
  closedDate?: Date;

  // Verificación
  @Prop({ type: Boolean, default: false })
  verified: boolean;

  @Prop({ type: Types.ObjectId, ref: "User" })
  verifiedBy?: Types.ObjectId;

  @Prop({ type: Date })
  verifiedDate?: Date;

  @Prop({ type: String })
  verificationNotes?: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const NonConformanceSchema =
  SchemaFactory.createForClass(NonConformance);

// Índices para QualityInspection
QualityInspectionSchema.index(
  { inspectionNumber: 1, tenantId: 1 },
  { unique: true },
);
QualityInspectionSchema.index({ tenantId: 1, status: 1 });
QualityInspectionSchema.index({ qcPlanId: 1, tenantId: 1 });
QualityInspectionSchema.index({ productId: 1, tenantId: 1 });
QualityInspectionSchema.index({ lotNumber: 1, tenantId: 1 });
QualityInspectionSchema.index({ manufacturingOrderId: 1, tenantId: 1 });
QualityInspectionSchema.index({ inspector: 1, tenantId: 1 });
QualityInspectionSchema.index({ inspectionDate: -1, tenantId: 1 });
QualityInspectionSchema.index({ overallResult: 1, tenantId: 1 });

// Índices para NonConformance
NonConformanceSchema.index({ ncNumber: 1, tenantId: 1 }, { unique: true });
NonConformanceSchema.index({ tenantId: 1, status: 1 });
NonConformanceSchema.index({ inspectionId: 1, tenantId: 1 });
NonConformanceSchema.index({ productId: 1, tenantId: 1 });
NonConformanceSchema.index({ lotNumber: 1, tenantId: 1 });
NonConformanceSchema.index({ severity: 1, tenantId: 1 });
NonConformanceSchema.index({ responsibleUserId: 1, tenantId: 1 });
NonConformanceSchema.index({ dueDate: 1, tenantId: 1 });
NonConformanceSchema.index({ createdAt: -1, tenantId: 1 });
