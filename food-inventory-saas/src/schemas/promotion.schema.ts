import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PromotionDocument = Promotion & Document;

@Schema({ timestamps: true })
export class Promotion {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, maxlength: 200 })
  name: string; // Nombre de la promoción

  @Prop({ type: String, maxlength: 1000 })
  description?: string;

  @Prop({
    type: String,
    enum: [
      "percentage_discount",
      "fixed_amount_discount",
      "buy_x_get_y",
      "tiered_pricing",
      "bundle_discount",
    ],
    required: true,
  })
  type: string;

  @Prop({
    type: String,
    enum: ["active", "inactive", "scheduled", "expired"],
    default: "active",
    index: true,
  })
  status: string;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: Number })
  priority?: number; // Para ordenar cuando múltiples promociones aplican

  // Configuración de descuento (para percentage_discount y fixed_amount_discount)
  @Prop({ type: Number })
  discountValue?: number; // Porcentaje o cantidad fija

  @Prop({ type: Number })
  maxDiscountAmount?: number; // Máximo descuento (para porcentajes)

  // Configuración Buy X Get Y
  @Prop({ type: Number })
  buyQuantity?: number; // Compra X

  @Prop({ type: Number })
  getQuantity?: number; // Recibe Y gratis

  @Prop({ type: Number })
  getDiscountPercentage?: number; // Descuento en Y (ej: 50% = compra 1 lleva 2do a mitad de precio)

  // Configuración Tiered Pricing (descuentos escalonados)
  @Prop({
    type: [
      {
        minQuantity: Number,
        maxQuantity: Number,
        discountPercentage: Number,
      },
    ],
  })
  tiers?: Array<{
    minQuantity: number;
    maxQuantity?: number;
    discountPercentage: number;
  }>;

  // Condiciones de aplicación
  @Prop({ type: Number })
  minimumPurchaseAmount?: number;

  @Prop({ type: Number })
  minimumQuantity?: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: "Product" }] })
  applicableProducts?: Types.ObjectId[]; // Productos específicos

  @Prop({ type: [{ type: Types.ObjectId, ref: "Category" }] })
  applicableCategories?: Types.ObjectId[]; // Categorías

  @Prop({ type: [{ type: Types.ObjectId, ref: "Product" }] })
  excludedProducts?: Types.ObjectId[]; // Productos excluidos

  // Para bundle discounts
  @Prop({
    type: [
      {
        productId: { type: Types.ObjectId, ref: "Product" },
        quantity: Number,
      },
    ],
  })
  bundleItems?: Array<{
    productId: Types.ObjectId;
    quantity: number;
  }>;

  @Prop({ type: Number })
  bundleDiscountPercentage?: number;

  // Restricciones
  @Prop({ type: [String], enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] })
  applicableDays?: string[]; // Días de la semana

  @Prop({ type: String }) // Formato: "HH:mm"
  applicableStartTime?: string;

  @Prop({ type: String }) // Formato: "HH:mm"
  applicableEndTime?: string;

  @Prop({ type: Number })
  maxUsageCount?: number; // Máximo de veces que se puede usar la promoción

  @Prop({ type: Number, default: 0 })
  currentUsageCount: number;

  @Prop({ type: Number })
  maxUsagePerCustomer?: number;

  @Prop({
    type: String,
    enum: ["all", "new_customers", "returning_customers", "vip"],
    default: "all",
  })
  customerEligibility: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: "Customer" }] })
  excludedCustomers?: Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  combinableWithCoupons: boolean; // ¿Se puede combinar con cupones?

  @Prop({ type: Boolean, default: false })
  combinableWithOtherPromotions: boolean; // ¿Se puede combinar con otras promociones?

  @Prop({ type: Boolean, default: true })
  autoApply: boolean; // Aplicar automáticamente en checkout

  @Prop({ type: Boolean, default: true })
  showInStorefront: boolean; // Mostrar en el storefront

  @Prop({ type: String })
  imageUrl?: string; // Imagen promocional

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: {
    campaign?: string;
    source?: string;
    notes?: string;
    [key: string]: any;
  };

  // Analytics
  @Prop({ type: Number, default: 0 })
  totalRevenue: number; // Ingresos generados con esta promoción

  @Prop({ type: Number, default: 0 })
  totalOrders: number; // Órdenes con esta promoción

  @Prop({ type: Number, default: 0 })
  totalDiscountGiven: number; // Total de descuento otorgado
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);

// Índices
PromotionSchema.index({ tenantId: 1, status: 1, startDate: 1, endDate: 1 });
PromotionSchema.index({ tenantId: 1, type: 1 });
PromotionSchema.index({ tenantId: 1, applicableProducts: 1 });
PromotionSchema.index({ tenantId: 1, applicableCategories: 1 });
PromotionSchema.index({ endDate: 1 }); // Para job de expiración
