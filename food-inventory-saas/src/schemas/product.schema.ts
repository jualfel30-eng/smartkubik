import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ProductDocument = Product & Document;

@Schema()
export class ProductVariant {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  sku: string;

  @Prop({ required: true })
  barcode: string;

  @Prop({ required: true })
  unit: string; // kg, g, l, ml, unidad, caja, etc.

  @Prop({ required: true })
  unitSize: number; // tamaño de la unidad (ej: 500 para 500g)

  @Prop({ required: true })
  basePrice: number; // precio base en VES

  @Prop({ required: true })
  costPrice: number; // precio de costo en VES

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  description?: string;

  @Prop([String])
  images?: string[];

  @Prop({ type: Object })
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
}

@Schema()
export class ProductSupplier {
  @Prop({ type: Types.ObjectId, ref: "Supplier", required: true })
  supplierId: Types.ObjectId;

  @Prop({ required: true })
  supplierName: string;

  @Prop({ required: true })
  supplierSku: string;

  @Prop({ required: true })
  costPrice: number;

  @Prop({ required: true })
  leadTimeDays: number;

  @Prop({ required: true })
  minimumOrderQuantity: number;

  @Prop({ default: true })
  isPreferred: boolean;

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, unique: true })
  sku: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  subcategory: string;

  @Prop({ required: true })
  brand: string;

  @Prop()
  description?: string;

  @Prop()
  ingredients?: string;

  @Prop([String])
  tags: string[];

  @Prop([ProductVariant])
  variants: ProductVariant[];

  @Prop([ProductSupplier])
  suppliers: ProductSupplier[];

  // Configuración específica para alimentos perecederos
  @Prop({ required: true })
  isPerishable: boolean;

  @Prop()
  shelfLifeDays?: number; // vida útil en días

  @Prop()
  storageTemperature?: string; // ambiente, refrigerado, congelado

  @Prop()
  storageHumidity?: string; // baja, media, alta

  @Prop([String])
  allergens?: string[]; // gluten, lactosa, nueces, etc.

  @Prop({ type: Object })
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
  };

  // Configuración de precios
  @Prop({ type: Object })
  pricingRules: {
    cashDiscount: number; // descuento por pago en efectivo
    cardSurcharge: number; // recargo por pago con tarjeta
    usdPrice?: number; // precio en USD si aplica
    minimumMargin: number; // margen mínimo de ganancia
    maximumDiscount: number; // descuento máximo permitido
  };

  // Configuración de inventario
  @Prop({ type: Object })
  inventoryConfig: {
    trackLots: boolean; // seguimiento por lotes
    trackExpiration: boolean; // seguimiento de fechas de vencimiento
    minimumStock: number; // stock mínimo
    maximumStock: number; // stock máximo
    reorderPoint: number; // punto de reorden
    reorderQuantity: number; // cantidad de reorden
    fefoEnabled: boolean; // First Expired First Out habilitado
  };

  // Configuración fiscal venezolana
  @Prop({ required: true, default: true })
  ivaApplicable: boolean; // si aplica IVA 16%

  @Prop({ required: true, default: false })
  igtfExempt: boolean; // si está exento de IGTF 3%

  @Prop({ required: true })
  taxCategory: string; // categoria fiscal del producto

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Índices para optimizar consultas
ProductSchema.index({ sku: 1, tenantId: 1 }, { unique: true });
ProductSchema.index({ name: "text", description: "text", tags: "text" });
ProductSchema.index({ brand: 1, tenantId: 1 });
ProductSchema.index({ isActive: 1, tenantId: 1 });
ProductSchema.index({ "variants.sku": 1, tenantId: 1 });
ProductSchema.index({ "variants.barcode": 1, tenantId: 1 });
ProductSchema.index({ isPerishable: 1, tenantId: 1 });
ProductSchema.index({ createdAt: -1, tenantId: 1 });
