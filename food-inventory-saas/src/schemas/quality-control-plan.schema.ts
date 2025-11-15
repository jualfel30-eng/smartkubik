import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type QualityControlPlanDocument = QualityControlPlan & Document;

/**
 * QC Checkpoint - Punto de inspección individual
 */
@Schema()
export class QCCheckpoint {
  readonly _id?: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string; // "pH Level", "Viscosity", "Color", "Temperature"

  @Prop({ type: String })
  description?: string;

  @Prop({
    type: String,
    enum: ["measurement", "visual", "binary", "text"],
    required: true,
  })
  testType: string; // Tipo de prueba

  @Prop({ type: String })
  testMethod?: string; // Método de prueba (ej: "ASTM D4052")

  @Prop({ type: String })
  expectedValue?: string; // Valor esperado como string

  @Prop({ type: Number })
  minimumValue?: number; // Valor mínimo numérico

  @Prop({ type: Number })
  maximumValue?: number; // Valor máximo numérico

  @Prop({ type: String })
  unit?: string; // Unidad de medida (°C, pH, etc.)

  @Prop({
    type: String,
    enum: ["minor", "major", "critical"],
    default: "major",
  })
  severity: string; // Severidad si falla

  @Prop({ type: Boolean, default: false })
  mandatory: boolean; // Si es obligatorio pasar para aprobar

  @Prop({ type: Number, default: 1 })
  sequence: number; // Orden de ejecución
}

export const QCCheckpointSchema = SchemaFactory.createForClass(QCCheckpoint);

/**
 * Quality Control Plan - Plan de Control de Calidad
 * Define qué inspecciones deben realizarse para un producto o proceso
 */
@Schema({ timestamps: true })
export class QualityControlPlan {
  @Prop({ type: String, required: true, unique: true })
  planCode: string; // QCP-001, QCP-COSMETICOS

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  // Aplicabilidad
  @Prop({ type: [{ type: Types.ObjectId, ref: "Product" }], default: [] })
  applicableProducts: Types.ObjectId[]; // Productos a los que aplica

  @Prop({ type: [String], default: [] })
  applicableCategories: string[]; // Categorías de productos

  @Prop({
    type: [String],
    enum: ["receiving", "in_process", "final_inspection"],
    default: ["receiving"],
  })
  inspectionStages: string[]; // Etapas donde se aplica

  // Checkpoints
  @Prop({ type: [QCCheckpointSchema], default: [] })
  checkpoints: QCCheckpoint[];

  // Plan de muestreo
  @Prop({ type: Object })
  samplingPlan?: {
    method: "random" | "systematic" | "judgmental"; // Método de muestreo
    sampleSize: number; // Tamaño de muestra
    acceptanceLevel: number; // Nivel de aceptación (AQL)
    frequency: string; // Frecuencia (ej: "cada lote", "diario")
  };

  // Equipamiento requerido
  @Prop({ type: [String], default: [] })
  requiredEquipment: string[]; // pH meter, viscosimeter, etc.

  // Tiempo estimado
  @Prop({ type: Number, default: 0, min: 0 })
  estimatedDurationMinutes: number;

  // Documentación
  @Prop({ type: [String], default: [] })
  attachments: string[]; // URLs a documentos, SOPs, etc.

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const QualityControlPlanSchema =
  SchemaFactory.createForClass(QualityControlPlan);

// Índices
QualityControlPlanSchema.index({ planCode: 1, tenantId: 1 }, { unique: true });
QualityControlPlanSchema.index({ tenantId: 1, isActive: 1 });
QualityControlPlanSchema.index({ applicableProducts: 1, tenantId: 1 });
QualityControlPlanSchema.index({ applicableCategories: 1, tenantId: 1 });
QualityControlPlanSchema.index({ inspectionStages: 1, tenantId: 1 });
