import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CouponDocument = Coupon & Document;

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, uppercase: true, trim: true })
  code: string; // Código del cupón (ej: "SAVE20", "SUMMER2024")

  @Prop({ type: String, maxlength: 500 })
  description?: string; // Descripción del cupón

  @Prop({
    type: String,
    enum: ["percentage", "fixed_amount"],
    required: true,
  })
  discountType: string; // Tipo de descuento

  @Prop({ type: Number, required: true, min: 0 })
  discountValue: number; // Valor del descuento (% o cantidad fija)

  @Prop({ type: Number, min: 0 })
  minimumPurchaseAmount?: number; // Monto mínimo de compra requerido

  @Prop({ type: Number, min: 0 })
  maxDiscountAmount?: number; // Descuento máximo (útil para % descuentos)

  @Prop({ type: Date, required: true })
  validFrom: Date; // Fecha de inicio de validez

  @Prop({ type: Date, required: true })
  validUntil: Date; // Fecha de fin de validez

  @Prop({ type: Boolean, default: true })
  isActive: boolean; // Estado activo/inactivo

  @Prop({ type: Number, min: 0 })
  maxUsageCount?: number; // Máximo de usos totales (null = ilimitado)

  @Prop({ type: Number, default: 0, min: 0 })
  currentUsageCount: number; // Usos actuales

  @Prop({ type: Number, min: 1 })
  maxUsagePerCustomer?: number; // Máximo de usos por cliente

  @Prop({ type: [{ type: Types.ObjectId, ref: "Product" }] })
  applicableProducts?: Types.ObjectId[]; // Productos específicos (null = todos)

  @Prop({ type: [{ type: Types.ObjectId, ref: "Category" }] })
  applicableCategories?: Types.ObjectId[]; // Categorías específicas

  @Prop({
    type: String,
    enum: ["all", "new_customers", "returning_customers", "vip"],
    default: "all",
  })
  customerEligibility: string; // Elegibilidad de clientes

  @Prop({ type: [{ type: Types.ObjectId, ref: "Customer" }] })
  excludedCustomers?: Types.ObjectId[]; // Clientes excluidos

  @Prop({ type: Boolean, default: true })
  combinableWithOtherOffers: boolean; // ¿Se puede combinar con otras ofertas?

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId; // Usuario que creó el cupón

  @Prop({ type: Object })
  metadata?: {
    campaign?: string;
    source?: string;
    notes?: string;
    [key: string]: any;
  };
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

// Índices compuestos para búsqueda eficiente
CouponSchema.index({ tenantId: 1, code: 1 }, { unique: true }); // Código único por tenant
CouponSchema.index({ tenantId: 1, isActive: 1, validFrom: 1, validUntil: 1 }); // Para búsqueda de cupones activos
CouponSchema.index({ tenantId: 1, validUntil: 1 }); // Para limpieza de cupones expirados
