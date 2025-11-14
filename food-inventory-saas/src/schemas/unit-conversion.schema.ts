import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type UnitConversionDocument = UnitConversion & Document;

/**
 * ConversionRule - Subdocumento que define una regla de conversión de unidades
 * Ejemplo: 1 caja = 2000 unidades (factor: 2000)
 */
@Schema()
export class ConversionRule {
  @Prop({ type: String, required: true })
  unit: string; // "caja", "paquete", "galón", "unidad", etc.

  @Prop({ type: String, required: true })
  abbreviation: string; // "cj", "paq", "gal", "und", etc.

  @Prop({ type: Number, required: true })
  factor: number; // Factor de conversión a la unidad base (ej: 2000 unidades por caja)

  @Prop({
    type: String,
    required: true,
    enum: ["purchase", "stock", "consumption"],
  })
  unitType: string; // Tipo de unidad: compra, almacenamiento, o consumo

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isDefault: boolean; // Si es la unidad por defecto para su tipo
}

const ConversionRuleSchema = SchemaFactory.createForClass(ConversionRule);

/**
 * UnitConversion - Configuración de conversión de unidades para un producto
 * Define cómo se maneja un producto en diferentes unidades (compra, almacenamiento, consumo)
 */
@Schema({ timestamps: true })
export class UnitConversion {
  @Prop({ type: String, required: true })
  productSku: string; // SKU del producto al que pertenece esta configuración

  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId; // Referencia al producto

  @Prop({ type: String, required: true })
  baseUnit: string; // Unidad más pequeña/base (ej: "unidad", "ml", "gramo")

  @Prop({ type: String, required: true })
  baseUnitAbbr: string; // Abreviación de la unidad base (ej: "und", "ml", "g")

  @Prop({ type: [ConversionRuleSchema], default: [] })
  conversions: ConversionRule[]; // Reglas de conversión disponibles

  @Prop({ type: String })
  defaultPurchaseUnit?: string; // Unidad por defecto para compras (ej: "caja")

  @Prop({ type: String })
  defaultStockUnit?: string; // Unidad por defecto para almacenamiento (ej: "paquete")

  @Prop({ type: String })
  defaultConsumptionUnit?: string; // Unidad por defecto para consumo (ej: "unidad")

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const UnitConversionSchema =
  SchemaFactory.createForClass(UnitConversion);

// Índices para optimizar queries comunes
UnitConversionSchema.index({ productId: 1, tenantId: 1 }, { unique: true });
UnitConversionSchema.index({ productSku: 1, tenantId: 1 }, { unique: true });
UnitConversionSchema.index({ tenantId: 1, isActive: 1 });
UnitConversionSchema.index({ tenantId: 1, productId: 1 });
