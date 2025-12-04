import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type UnitTypeDocument = UnitType & Document;

/**
 * Unit category enumeration
 * Defines the type of measurement for the unit
 */
export enum UnitCategory {
  WEIGHT = "weight", // Peso: kg, g, lb, oz, ton
  VOLUME = "volume", // Volumen: L, ml, gal, cup
  LENGTH = "length", // Longitud: m, cm, mm, in, ft
  UNIT = "unit", // Unidades: und, paquete, caja, docena
  TIME = "time", // Tiempo: hr, min, día, semana
  AREA = "area", // Área: m², cm², ft²
  TEMPERATURE = "temperature", // Temperatura: °C, °F, K
  OTHER = "other", // Otro tipo personalizado
}

/**
 * Sub-schema for unit conversions within a UnitType
 */
@Schema({ _id: false })
export class UnitConversionRule {
  @Prop({ type: String, required: true })
  unit: string; // "kilogramo", "gramo", "libra"

  @Prop({ type: String, required: true })
  abbreviation: string; // "kg", "g", "lb"

  @Prop({ type: String, required: false })
  pluralName?: string; // "kilogramos", "gramos", "libras"

  @Prop({ type: Number, required: true, min: 0.0000001 })
  factor: number; // Factor de conversión relativo a la unidad base

  @Prop({ type: Boolean, default: false })
  isBase: boolean; // Indica si esta es la unidad base (factor = 1.0)

  @Prop({ type: String, required: false })
  symbol?: string; // Símbolo opcional: "°C", "m²"
}

export const UnitConversionRuleSchema =
  SchemaFactory.createForClass(UnitConversionRule);

/**
 * UnitType Schema
 * Represents a reusable unit type that can be assigned to products
 * Defines all possible conversions within a category of measurement
 */
@Schema({ timestamps: true })
export class UnitType {
  @Prop({ type: String, required: true })
  name: string; // "Peso", "Volumen", "Unidades"

  @Prop({ type: String, enum: UnitCategory, required: true })
  category: UnitCategory;

  @Prop({ type: String, required: false })
  description?: string; // "Unidades de medida de peso"

  @Prop({
    type: {
      name: String,
      abbreviation: String,
    },
    required: true,
  })
  baseUnit: {
    name: string; // "kilogramo"
    abbreviation: string; // "kg"
  };

  @Prop({ type: [UnitConversionRuleSchema], required: true, default: [] })
  conversions: UnitConversionRule[];

  @Prop({ type: Boolean, default: false })
  isSystemDefined: boolean; // Si es un tipo predefinido del sistema (no editable)

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: false })
  tenantId?: Types.ObjectId; // null = global, ObjectId = específico del tenant

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>; // Campos personalizables

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const UnitTypeSchema = SchemaFactory.createForClass(UnitType);

// Índices
UnitTypeSchema.index({ name: 1, tenantId: 1 }, { unique: true });
UnitTypeSchema.index({ category: 1, isActive: 1 });
UnitTypeSchema.index({ isSystemDefined: 1, isActive: 1 });
UnitTypeSchema.index({ tenantId: 1, isActive: 1 });

/**
 * Virtual para obtener solo las conversiones activas
 */
UnitTypeSchema.virtual("activeConversions").get(function (
  this: UnitTypeDocument,
) {
  return this.conversions;
});

/**
 * Método para encontrar una conversión por abreviación
 */
UnitTypeSchema.methods.findConversionByAbbr = function (
  abbreviation: string,
): UnitConversionRule | undefined {
  return this.conversions.find((c) => c.abbreviation === abbreviation);
};

/**
 * Método para convertir entre dos unidades del mismo tipo
 */
UnitTypeSchema.methods.convertBetweenUnits = function (
  fromAbbr: string,
  toAbbr: string,
  quantity: number,
): { quantity: number; unit: string } | null {
  const fromConversion = this.findConversionByAbbr(fromAbbr);
  const toConversion = this.findConversionByAbbr(toAbbr);

  if (!fromConversion || !toConversion) {
    return null;
  }

  // Convertir a unidad base, luego a unidad destino
  const baseQuantity = quantity * fromConversion.factor;
  const convertedQuantity = baseQuantity / toConversion.factor;

  return {
    quantity: Math.round(convertedQuantity * 100000) / 100000, // 5 decimales
    unit: toAbbr,
  };
};
