import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ManufacturingOrderDocument = ManufacturingOrder & Document;

/**
 * Componente requerido en una orden de manufactura
 */
@Schema()
export class ManufacturingOrderComponent {
  readonly _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Product" })
  variantId?: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  requiredQuantity: number;

  @Prop({ type: Number, default: 0, min: 0 })
  consumedQuantity: number;

  @Prop({ type: String, required: true })
  unit: string;

  @Prop({ type: Number, default: 0, min: 0 })
  unitCost: number; // Costo unitario al momento de consumo

  @Prop({ type: Number, default: 0, min: 0 })
  totalCost: number; // consumedQuantity × unitCost

  @Prop({
    type: String,
    enum: ["pending", "reserved", "consumed"],
    default: "pending",
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: "Inventory" })
  inventoryId?: Types.ObjectId; // Referencia al lote usado

  @Prop({ type: Date })
  consumedAt?: Date;
}

export const ManufacturingOrderComponentSchema = SchemaFactory.createForClass(
  ManufacturingOrderComponent,
);

/**
 * Operación individual en una orden de manufactura
 */
@Schema()
export class ManufacturingOrderOperation {
  readonly _id?: Types.ObjectId;

  @Prop({ type: Number, required: true })
  sequence: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: "WorkCenter", required: true })
  workCenterId: Types.ObjectId;

  @Prop({ type: Number, default: 0, min: 0 })
  estimatedSetupTime: number; // minutos

  @Prop({ type: Number, default: 0, min: 0 })
  estimatedCycleTime: number; // minutos

  @Prop({ type: Number, default: 0, min: 0 })
  estimatedTeardownTime: number; // minutos

  @Prop({ type: Number, default: 0, min: 0 })
  actualSetupTime: number; // minutos reales

  @Prop({ type: Number, default: 0, min: 0 })
  actualCycleTime: number; // minutos reales

  @Prop({ type: Number, default: 0, min: 0 })
  actualTeardownTime: number; // minutos reales

  @Prop({ type: Number, default: 0, min: 0 })
  estimatedLaborCost: number;

  @Prop({ type: Number, default: 0, min: 0 })
  actualLaborCost: number;

  @Prop({ type: Number, default: 0, min: 0 })
  estimatedOverheadCost: number;

  @Prop({ type: Number, default: 0, min: 0 })
  actualOverheadCost: number;

  @Prop({
    type: String,
    enum: ["pending", "in_progress", "completed", "cancelled"],
    default: "pending",
  })
  status: string;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  assignedTo?: Types.ObjectId;

  @Prop({ type: String })
  notes?: string;
}

export const ManufacturingOrderOperationSchema = SchemaFactory.createForClass(
  ManufacturingOrderOperation,
);

/**
 * Manufacturing Order - Orden de Manufactura
 * Documento que especifica qué producir, cuánto y cómo
 */
@Schema({ timestamps: true })
export class ManufacturingOrder {
  @Prop({ type: String, required: true })
  orderNumber: string; // MO-20241112-001

  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Product" })
  productVariantId?: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0.001 })
  quantityToProduce: number;

  @Prop({ type: Number, default: 0, min: 0 })
  quantityProduced: number;

  @Prop({ type: String, required: true })
  unit: string;

  @Prop({ type: Types.ObjectId, ref: "ProductionVersion", required: true })
  productionVersionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "BillOfMaterials", required: true })
  bomId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Routing" })
  routingId?: Types.ObjectId;

  @Prop({ type: [ManufacturingOrderComponentSchema], default: [] })
  components: ManufacturingOrderComponent[];

  @Prop({ type: [ManufacturingOrderOperationSchema], default: [] })
  operations: ManufacturingOrderOperation[];

  @Prop({
    type: String,
    enum: ["draft", "confirmed", "in_progress", "completed", "cancelled"],
    default: "draft",
  })
  status: string;

  @Prop({ type: String, enum: ["normal", "urgent", "low"], default: "normal" })
  priority: string;

  @Prop({ type: Date, required: true })
  scheduledStartDate: Date;

  @Prop({ type: Date })
  scheduledEndDate?: Date;

  @Prop({ type: Date })
  actualStartDate?: Date;

  @Prop({ type: Date })
  actualEndDate?: Date;

  // Costos
  @Prop({ type: Number, default: 0, min: 0 })
  estimatedMaterialCost: number;

  @Prop({ type: Number, default: 0, min: 0 })
  actualMaterialCost: number;

  @Prop({ type: Number, default: 0, min: 0 })
  estimatedLaborCost: number;

  @Prop({ type: Number, default: 0, min: 0 })
  actualLaborCost: number;

  @Prop({ type: Number, default: 0, min: 0 })
  estimatedOverheadCost: number;

  @Prop({ type: Number, default: 0, min: 0 })
  actualOverheadCost: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalEstimatedCost: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalActualCost: number;

  @Prop({ type: String, default: "USD" })
  currency: string;

  // Referencias
  @Prop({ type: Types.ObjectId, ref: "Order" })
  sourceOrderId?: Types.ObjectId; // Si viene de una venta

  @Prop({ type: String })
  sourceReference?: string; // Referencia externa

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  completedBy?: Types.ObjectId;
}

export const ManufacturingOrderSchema =
  SchemaFactory.createForClass(ManufacturingOrder);

// Índices
ManufacturingOrderSchema.index(
  { orderNumber: 1, tenantId: 1 },
  { unique: true },
);
ManufacturingOrderSchema.index({ tenantId: 1, status: 1 });
ManufacturingOrderSchema.index({ tenantId: 1, productId: 1 });
ManufacturingOrderSchema.index({ tenantId: 1, scheduledStartDate: 1 });
ManufacturingOrderSchema.index({ sourceOrderId: 1, tenantId: 1 });
