import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type WasteEntryDocument = WasteEntry & Document;

export type WasteReason =
  | "spoilage" // Deterioro/caducidad
  | "overproduction" // Sobreproducción
  | "preparation-error" // Error de preparación
  | "customer-return" // Devolución de cliente
  | "accident" // Accidente/derrame
  | "quality-issue" // Problema de calidad
  | "expired" // Expirado
  | "broken-damaged" // Roto/dañado
  | "other"; // Otro

@Schema({ timestamps: true })
export class WasteEntry extends Document {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Product", required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  productName: string; // Denormalizado para reportes

  @Prop({ type: String })
  sku?: string;

  @Prop({ type: Number, required: true, min: 0 })
  quantity: number;

  @Prop({ type: String, required: true })
  unit: string; // kg, L, unidad, etc.

  @Prop({
    type: String,
    enum: [
      "spoilage",
      "overproduction",
      "preparation-error",
      "customer-return",
      "accident",
      "quality-issue",
      "expired",
      "broken-damaged",
      "other",
    ],
    required: true,
    index: true,
  })
  reason: WasteReason;

  @Prop({ type: Number, required: true, default: 0 })
  costPerUnit: number; // Costo por unidad

  @Prop({ type: Number, required: true, default: 0 })
  totalCost: number; // Costo total del desperdicio

  @Prop({ type: String })
  location?: string; // Cocina, almacén, bar, etc.

  @Prop({ type: Types.ObjectId, ref: "User" })
  reportedBy?: Types.ObjectId; // Empleado que reportó

  @Prop({ type: String })
  reportedByName?: string;

  @Prop({ type: Date, default: () => new Date(), index: true })
  wasteDate: Date; // Fecha del desperdicio

  @Prop({ type: String })
  notes?: string; // Notas adicionales

  @Prop({
    type: {
      temperature: Number, // °C
      humidity: Number, // %
      storageCondition: String, // "refrigerated", "frozen", "ambient"
    },
  })
  environmentalFactors?: {
    temperature?: number;
    humidity?: number;
    storageCondition?: string;
  };

  @Prop({ type: Boolean, default: false })
  isPreventable: boolean; // Si el desperdicio era prevenible

  @Prop({ type: String })
  preventionSuggestion?: string; // Sugerencia para prevenir en el futuro

  @Prop({ type: String })
  category?: string; // Categoría del producto (dairy, meat, vegetables, etc.)

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const WasteEntrySchema = SchemaFactory.createForClass(WasteEntry);

// Índices compuestos para analytics
WasteEntrySchema.index({ tenantId: 1, wasteDate: -1 });
WasteEntrySchema.index({ tenantId: 1, reason: 1, wasteDate: -1 });
WasteEntrySchema.index({ tenantId: 1, productId: 1, wasteDate: -1 });
WasteEntrySchema.index({ tenantId: 1, category: 1, wasteDate: -1 });
