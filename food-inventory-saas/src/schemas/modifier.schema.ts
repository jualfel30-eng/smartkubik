import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * Modifier Schema
 * Representa un modificador individual (ej: "Sin Queso", "Extra Salsa", "Punto Medio")
 * Los modificadores se agrupan en ModifierGroups
 */
@Schema({ timestamps: true })
export class Modifier extends Document {
  @Prop({ required: true, trim: true })
  name: string; // "Sin Queso", "Extra Bacon", "Punto Medio"

  @Prop({ trim: true })
  description?: string; // Descripción opcional

  @Prop({ required: true, default: 0, min: 0 })
  priceAdjustment: number; // Ajuste de precio (puede ser 0, positivo o negativo)

  @Prop({ default: true })
  available: boolean; // Disponibilidad del modificador

  @Prop({ default: 0 })
  sortOrder: number; // Orden de visualización

  @Prop({
    type: Types.ObjectId,
    ref: "ModifierGroup",
    required: true,
    index: true,
  })
  groupId: Types.ObjectId; // Grupo al que pertenece

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const ModifierSchema = SchemaFactory.createForClass(Modifier);

// Índices compuestos
ModifierSchema.index({ tenantId: 1, groupId: 1, isDeleted: 1 });
ModifierSchema.index({ tenantId: 1, name: 1 });
