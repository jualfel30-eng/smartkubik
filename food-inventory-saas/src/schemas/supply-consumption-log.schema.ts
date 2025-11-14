import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type SupplyConsumptionLogDocument = SupplyConsumptionLog & Document;

@Schema({ timestamps: true })
export class SupplyConsumptionLog {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  supplyId: Types.ObjectId; // El producto de tipo "supply" consumido

  @Prop({ type: Number, required: true })
  quantityConsumed: number; // Cantidad consumida

  @Prop({ type: String, required: true })
  unitOfMeasure: string; // Unidad de medida

  @Prop({ type: Date, required: true, default: Date.now })
  consumedAt: Date; // Fecha y hora del consumo

  @Prop({ type: String, required: true })
  consumptionType: string; // "manual", "automatic", "scheduled", etc.

  @Prop({ type: String })
  department?: string; // Departamento que consumió el suministro

  @Prop({ type: Types.ObjectId, ref: "User" })
  consumedBy?: Types.ObjectId; // Usuario que registró el consumo

  @Prop({ type: Types.ObjectId, ref: "Order" })
  relatedOrderId?: Types.ObjectId; // Si está relacionado con una orden

  @Prop({ type: String })
  reason?: string; // Razón del consumo

  @Prop({ type: String })
  notes?: string; // Notas adicionales

  @Prop({ type: Object })
  costInfo?: {
    unitCost: number;
    totalCost: number;
    currency: string;
  };

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>; // Campos personalizables

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;
}

export const SupplyConsumptionLogSchema =
  SchemaFactory.createForClass(SupplyConsumptionLog);

// Índices
SupplyConsumptionLogSchema.index({ tenantId: 1, supplyId: 1, consumedAt: -1 });
SupplyConsumptionLogSchema.index({ tenantId: 1, consumedAt: -1 });
SupplyConsumptionLogSchema.index({
  tenantId: 1,
  department: 1,
  consumedAt: -1,
});
SupplyConsumptionLogSchema.index({
  tenantId: 1,
  consumedBy: 1,
  consumedAt: -1,
});
SupplyConsumptionLogSchema.index({ tenantId: 1, consumptionType: 1 });
SupplyConsumptionLogSchema.index({ tenantId: 1, relatedOrderId: 1 });
