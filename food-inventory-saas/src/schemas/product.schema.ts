import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ProductDocument = Product & Document;

export enum ProductType {
  SIMPLE = "simple",
  CONSUMABLE = "consumable",
  SUPPLY = "supply",
}

@Schema()
export class ProductVariant {
  readonly _id?: Types.ObjectId;

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

  @Prop({ type: Object, default: {} })
  attributes?: Record<string, any>;
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

  // === SUPPLIER PAYMENT CONFIGURATION (Synced from Supplier) ===
  // Moneda principal en que el proveedor vende al tenant
  @Prop({ type: String, default: "USD" })
  paymentCurrency: string; // USD, USD_PARALELO, VES, EUR, etc.

  // Método de pago preferido del proveedor
  @Prop({ type: String })
  preferredPaymentMethod?: string; // zelle, efectivo_usd, transferencia_ves, pago_movil, etc.

  // Métodos de pago aceptados por este proveedor
  @Prop({ type: [String], default: [] })
  acceptedPaymentMethods: string[];

  // Indica si este proveedor vende a tasa paralela (importante para ajustes)
  @Prop({ type: Boolean, default: false })
  usesParallelRate: boolean;

  // Fecha de última sincronización con el proveedor
  @Prop({ type: Date })
  paymentConfigSyncedAt?: Date;
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

  @Prop({ type: Boolean, default: false })
  isSoldByWeight?: boolean; // Si esta unidad específica se vende por peso
}
const SellingUnitSchema = SchemaFactory.createForClass(SellingUnit);

@Schema({ timestamps: true })
export class Product {
  @Prop({ type: String, required: true, unique: true })
  sku: string;

  @Prop({
    type: String,
    enum: ProductType,
    default: ProductType.SIMPLE,
    index: true,
  })
  productType: ProductType;

  @Prop({ type: Types.ObjectId, required: false })
  typeConfigId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: [String], required: true })
  category: string[];

  @Prop({ type: [String], required: true })
  subcategory: string[];

  @Prop({ type: String, required: true })
  brand: string;

  @Prop({ type: String })
  origin?: string; // Pais de origen

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

  @Prop({ type: Object, default: {} })
  attributes?: Record<string, any>;

  @Prop({ type: Object })
  pricingRules: {
    cashDiscount: number;
    cardSurcharge: number;
    usdPrice?: number;
    minimumMargin: number;
    maximumDiscount: number;
    bulkDiscountEnabled?: boolean;
    bulkDiscountRules?: Array<{
      minQuantity: number;
      discountPercentage: number;
    }>;
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

  // Promoción/Oferta activa (separado de descuentos por volumen)
  @Prop({ type: Boolean, default: false })
  hasActivePromotion: boolean;

  @Prop({ type: Object })
  promotion?: {
    discountPercentage: number;
    reason: string; // promocion_temporal, liquidacion, temporada, lanzamiento, etc.
    startDate: Date;
    endDate: Date;
    durationDays?: number; // Alternativa a endDate
    isActive: boolean;
    autoDeactivate: boolean; // Se desactiva automáticamente al llegar a endDate
  };

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
ProductSchema.index(
  { "variants.barcode": 1, tenantId: 1 },
  {
    name: "uniq_variant_barcode_per_tenant",
    unique: true,
    partialFilterExpression: {
      "variants.barcode": { $exists: true, $ne: "" },
    },
  },
);
ProductSchema.index({ isPerishable: 1, tenantId: 1 });
ProductSchema.index({ createdAt: -1, tenantId: 1 });

// PERFORMANCE OPTIMIZATION: Compound indexes for common query patterns
ProductSchema.index({ tenantId: 1, category: 1 }); // Category filtering
ProductSchema.index({ tenantId: 1, isActive: 1, createdAt: -1 }); // Active products sorted by date
ProductSchema.index({ tenantId: 1, subcategory: 1 }); // Subcategory filtering
ProductSchema.index({ tenantId: 1, productType: 1 }); // Product type filtering

// PRICING ENGINE: Indexes for supplier payment filtering
ProductSchema.index({ "suppliers.paymentCurrency": 1, tenantId: 1 }); // Filter by payment currency
ProductSchema.index({ "suppliers.usesParallelRate": 1, tenantId: 1 }); // Filter by parallel rate usage
ProductSchema.index({ "suppliers.preferredPaymentMethod": 1, tenantId: 1 }); // Filter by payment method
ProductSchema.index({ "suppliers.supplierId": 1, tenantId: 1 }); // Filter by supplier
