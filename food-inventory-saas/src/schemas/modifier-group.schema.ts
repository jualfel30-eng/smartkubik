import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * ModifierGroup Schema
 * Representa un grupo de modificadores (ej: "Proteínas", "Toppings", "Punto de Cocción")
 * Se puede asignar a múltiples productos
 */
@Schema({ timestamps: true })
export class ModifierGroup extends Document {
  @Prop({ required: true, trim: true })
  name: string; // "Proteínas", "Toppings", "Punto de Cocción", "Extras"

  @Prop({ trim: true })
  description?: string;

  @Prop({
    enum: ["single", "multiple"],
    default: "single",
    required: true,
  })
  selectionType: string; // 'single' = radio buttons, 'multiple' = checkboxes

  @Prop({ default: 0, min: 0 })
  minSelections: number; // Mínimo de modificadores que se deben seleccionar

  @Prop({ min: 0 })
  maxSelections?: number; // Máximo de modificadores (null = ilimitado)

  @Prop({ default: true })
  required: boolean; // Si es obligatorio seleccionar al menos uno

  @Prop({ default: true })
  available: boolean;

  @Prop({ default: 0 })
  sortOrder: number; // Orden de visualización del grupo

  @Prop({ type: [Types.ObjectId], ref: "Product", default: [] })
  applicableProducts: Types.ObjectId[]; // Productos a los que aplica este grupo

  @Prop({ type: [String], default: [] })
  applicableCategories: string[]; // O categorías (más flexible)

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const ModifierGroupSchema = SchemaFactory.createForClass(ModifierGroup);

// Índices
ModifierGroupSchema.index({ tenantId: 1, isDeleted: 1 });
ModifierGroupSchema.index({ tenantId: 1, name: 1 });
ModifierGroupSchema.index({ tenantId: 1, applicableProducts: 1 });
