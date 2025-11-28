import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * ComponentEffect Schema
 * Define cómo un modificador afecta los componentes/ingredientes del BOM
 */
@Schema({ _id: false })
export class ComponentEffect {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  componentProductId: Types.ObjectId; // ID del producto/ingrediente afectado

  @Prop({
    type: String,
    enum: ["exclude", "multiply", "add"],
    required: true,
  })
  action: string; // exclude: no deducir, multiply: multiplicar cantidad, add: agregar cantidad

  @Prop({ type: Number, default: 1 })
  quantity: number; // Multiplicador (para multiply) o cantidad a agregar (para add)
}

export const ComponentEffectSchema =
  SchemaFactory.createForClass(ComponentEffect);

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

  @Prop({ type: [ComponentEffectSchema], default: [] })
  componentEffects: ComponentEffect[]; // Efectos sobre componentes del BOM

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const ModifierSchema = SchemaFactory.createForClass(Modifier);

// Índices compuestos
ModifierSchema.index({ tenantId: 1, groupId: 1, isDeleted: 1 });
ModifierSchema.index({ tenantId: 1, name: 1 });
