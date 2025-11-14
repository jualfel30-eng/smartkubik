import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type RoutingDocument = Routing & Document;

/**
 * Operación individual en un routing
 */
@Schema()
export class RoutingOperation {
  readonly _id?: Types.ObjectId;

  @Prop({ type: Number, required: true })
  sequence: number; // 10, 20, 30 (múltiplos de 10 para insertar entre medio)

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: "WorkCenter", required: true })
  workCenterId: Types.ObjectId;

  // Tiempos (en minutos)
  @Prop({ type: Number, default: 0, min: 0 })
  setupTime: number; // Tiempo de preparación

  @Prop({ type: Number, required: true, min: 0 })
  cycleTime: number; // Tiempo de ciclo por unidad

  @Prop({ type: Number, default: 0, min: 0 })
  teardownTime: number; // Tiempo de limpieza/finalización

  // Recursos
  @Prop({ type: Number, default: 1, min: 1 })
  laborRequired: number; // Personas necesarias

  @Prop({ type: Number, default: 1, min: 1 })
  machinesRequired: number; // Máquinas necesarias

  // Costos adicionales
  @Prop({ type: Number, default: 0, min: 0 })
  additionalCost: number; // Costos extra (electricidad, gas, etc.)

  @Prop({ type: String })
  instructions?: string; // Instrucciones para el operador

  @Prop({ type: Boolean, default: false })
  requiresQualityCheck: boolean;

  @Prop({ type: String })
  notes?: string;
}

export const RoutingOperationSchema =
  SchemaFactory.createForClass(RoutingOperation);

/**
 * Routing - Ruta de Producción
 * Define la secuencia de operaciones para producir un producto
 */
@Schema({ timestamps: true })
export class Routing {
  @Prop({ type: String, required: true })
  code: string; // RTG-001, RTG-HAMBURGUESA

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Product" })
  productVariantId?: Types.ObjectId;

  @Prop({ type: [RoutingOperationSchema], default: [] })
  operations: RoutingOperation[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date })
  validFrom?: Date;

  @Prop({ type: Date })
  validTo?: Date;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const RoutingSchema = SchemaFactory.createForClass(Routing);

// Índices
RoutingSchema.index({ code: 1, tenantId: 1 }, { unique: true });
RoutingSchema.index({ productId: 1, tenantId: 1 });
RoutingSchema.index({ tenantId: 1, isActive: 1 });
