import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ProductDocument = Product & Document;

@Schema()
export class ProductVariant {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  sku: string;

  @Prop({ type: String })
  barcode: string;

  @Prop({ type: String, required: true })
  unit: string;

  @Prop({ type: Number, required: true })
  unitSize: number;

  @Prop({ type: Number, required: true })
  basePrice: number;

  @Prop({ type: Number, required: true })
  costPrice: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: [String] })
  images?: string[];

  @Prop({ type: Object })
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
}
const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

@Schema()
export class ProductSupplier {
  @Prop({ type: Types.ObjectId, ref: "Supplier", required: true })
  supplierId: Types.ObjectId;

  @Prop({ type: String, required: true })
  supplierName: string;

  @Prop({ type: String, required: true })
  supplierSku: string;

  @Prop({ type: Number, required: true })
  costPrice: number;

  @Prop({ type: Number, required: true })
  leadTimeDays: number;

  @Prop({ type: Number, required: true })
  minimumOrderQuantity: number;

  @Prop({ type: Boolean, default: true })
  isPreferred: boolean;

  @Prop({ type: Date, default: Date.now })
  lastUpdated: Date;
}
const ProductSupplierSchema = SchemaFactory.createForClass(ProductSupplier);

@Schema()
export class SellingUnit {
  @Prop({ type: String, required: true })
  name: string; // "Kilogramos", "Gramos", "Libras", "Cajas", "Unidades"

  @Prop({ type: String, required: true })
  abbreviation: string; // "kg", "g", "lb", "caja", "und"

  @Prop({ type: Number, required: true })
  conversionFactor: number; // Factor de conversión a la unidad base (ej: 1 kg = 1000 g)

  @Prop({ type: Number, required: true })
  pricePerUnit: number; // Precio por esta unidad

  @Prop({ type: Number, required: true })
  costPerUnit: number; // Costo por esta unidad

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isDefault: boolean; // Unidad por defecto al vender

  @Prop({ type: Number })
  minimumQuantity?: number; // Cantidad mínima de venta (ej: mínimo 100g)

  @Prop({ type: Number })
  incrementStep?: number; // Incremento permitido (ej: de 100 en 100 gramos)
}
const SellingUnitSchema = SchemaFactory.createForClass(SellingUnit);

@Schema({ timestamps: true })
export class Product {
  @Prop({ type: String, required: true, unique: true })
  sku: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: String, required: true })
  subcategory: string;

  @Prop({ type: String, required: true })
  brand: string;

  @Prop({ type: String, default: "unidad" })
  unitOfMeasure: string; // Unidad base para inventario

  @Prop({ type: Boolean, default: false })
  isSoldByWeight: boolean;

  @Prop({ type: Boolean, default: false })
  hasMultipleSellingUnits: boolean; // Si tiene múltiples unidades de venta

  @Prop({ type: [SellingUnitSchema], default: [] })
  sellingUnits: SellingUnit[]; // Unidades de venta disponibles

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  ingredients?: string;

  @Prop({ type: [String] })
  tags: string[];

  @Prop({ type: [ProductVariantSchema] })
  variants: ProductVariant[];

  @Prop({ type: [ProductSupplierSchema] })
  suppliers: ProductSupplier[];

  @Prop({ type: Boolean, required: true })
  isPerishable: boolean;

  @Prop({ type: Number })
  shelfLifeDays?: number;

  @Prop({ type: String })
  storageTemperature?: string;

  @Prop({ type: String })
  storageHumidity?: string;

  @Prop({ type: [String] })
  allergens?: string[];

  @Prop({ type: Object })
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
  };

  @Prop({ type: Object })
  pricingRules: {
    cashDiscount: number;
    cardSurcharge: number;
    usdPrice?: number;
    minimumMargin: number;
    maximumDiscount: number;
  };

  @Prop({ type: Object })
  inventoryConfig: {
    trackLots: boolean;
    trackExpiration: boolean;
    minimumStock: number;
    maximumStock: number;
    reorderPoint: number;
    reorderQuantity: number;
    fefoEnabled: boolean;
  };

  @Prop({ type: Boolean, required: true, default: true })
  ivaApplicable: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  igtfExempt: boolean;

  @Prop({ type: String, required: true })
  taxCategory: string;

  @Prop({ type: Boolean, default: true })
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
