import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema()
export class ProductPurchaseItem {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop()
  productCode?: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  totalPrice: number;

  @Prop()
  category?: string;

  @Prop()
  brand?: string;

  @Prop()
  unit?: string;

  @Prop({ type: Number })
  discount?: number;

  @Prop({ type: Number })
  tax?: number;
}

const ProductPurchaseItemSchema =
  SchemaFactory.createForClass(ProductPurchaseItem);

@Schema({ timestamps: true })
export class CustomerTransactionHistory {
  @Prop({ type: Types.ObjectId, ref: "Customer", required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Order", required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  orderNumber: string;

  @Prop({ required: true, index: true })
  orderDate: Date;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ type: Number, default: 0 })
  subtotal: number;

  @Prop({ type: Number, default: 0 })
  tax: number;

  @Prop({ type: Number, default: 0 })
  discount: number;

  @Prop({
    type: String,
    enum: ["completed", "delivered", "cancelled", "refunded", "pending"],
    default: "completed",
    index: true,
  })
  status: string;

  @Prop()
  paymentMethod?: string;

  @Prop({ type: Boolean, default: false })
  isPaid: boolean;

  // Items purchased - CRÍTICO para análisis por producto
  @Prop({ type: [ProductPurchaseItemSchema], required: true })
  items: ProductPurchaseItem[];

  // Categorías de productos en esta transacción (para búsquedas rápidas)
  @Prop({ type: [String], index: true })
  productCategories: string[];

  // IDs de productos (para búsquedas rápidas)
  @Prop({ type: [Types.ObjectId], index: true })
  productIds: Types.ObjectId[];

  // Información adicional
  @Prop()
  deliveryAddress?: string;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  // Metadata para análisis
  @Prop({ type: Object })
  metadata?: {
    channel?: string; // online, store, phone, etc.
    source?: string; // marketing campaign, direct, referral
    campaignId?: string; // si vino de una campaña
  };
}

export type CustomerTransactionHistoryDocument = CustomerTransactionHistory &
  Document;
export const CustomerTransactionHistorySchema = SchemaFactory.createForClass(
  CustomerTransactionHistory,
);

// Indexes compuestos para búsquedas eficientes
CustomerTransactionHistorySchema.index({
  tenantId: 1,
  customerId: 1,
  orderDate: -1,
});
CustomerTransactionHistorySchema.index({
  tenantId: 1,
  productIds: 1,
  orderDate: -1,
});
CustomerTransactionHistorySchema.index({
  tenantId: 1,
  productCategories: 1,
  orderDate: -1,
});
CustomerTransactionHistorySchema.index({
  tenantId: 1,
  status: 1,
  orderDate: -1,
});
