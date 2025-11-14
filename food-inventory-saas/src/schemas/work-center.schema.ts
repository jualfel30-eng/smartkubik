import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type WorkCenterDocument = WorkCenter & Document;

/**
 * Work Center - Centro de Trabajo
 * Representa una estación de trabajo, máquina o grupo de trabajadores
 * donde se ejecutan operaciones de producción
 */
@Schema({ timestamps: true })
export class WorkCenter {
  @Prop({ type: String, required: true })
  code: string; // WC-001, WC-COCINA, WC-HORNO

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, enum: ["machine", "labor", "both"], required: true })
  type: string;

  // Capacidad
  @Prop({ type: Number, default: 1, min: 0.1 })
  capacityFactor: number; // Máquinas/personas disponibles

  @Prop({ type: Number, default: 8, min: 0 })
  hoursPerDay: number;

  @Prop({ type: Number, default: 5, min: 0, max: 7 })
  workingDaysPerWeek: number;

  // Costos
  @Prop({ type: Number, default: 0, min: 0 })
  costPerHour: number; // Costo operativo por hora

  @Prop({ type: String, default: "USD" })
  currency: string;

  // Eficiencia
  @Prop({ type: Number, default: 100, min: 0, max: 100 })
  efficiencyPercentage: number; // % de eficiencia real

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String })
  location?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const WorkCenterSchema = SchemaFactory.createForClass(WorkCenter);

// Índices
WorkCenterSchema.index({ code: 1, tenantId: 1 }, { unique: true });
WorkCenterSchema.index({ tenantId: 1, isActive: 1 });
WorkCenterSchema.index({ tenantId: 1, type: 1 });
