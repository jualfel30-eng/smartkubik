import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema()
export class SupplierPurchaseItem {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop()
  productCode?: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitCost: number;

  @Prop({ required: true })
  totalCost: number;

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

const SupplierPurchaseItemSchema =
  SchemaFactory.createForClass(SupplierPurchaseItem);

@Schema({ timestamps: true })
export class SupplierTransactionHistory {
  @Prop({ type: Types.ObjectId, ref: "Supplier", required: true, index: true })
  supplierId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "PurchaseOrder",
    required: true,
    index: true,
  })
  purchaseOrderId: Types.ObjectId;

  @Prop({ required: true })
  purchaseOrderNumber: string;

  @Prop({ required: true, index: true })
  orderDate: Date;

  @Prop()
  deliveryDate?: Date;

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
    enum: ["pending", "approved", "received", "cancelled", "completed"],
    default: "pending",
    index: true,
  })
  status: string;

  @Prop()
  paymentMethod?: string;

  @Prop({ type: Boolean, default: false })
  isPaid: boolean;

  @Prop()
  paymentDueDate?: Date;

  // Items purchased - CRÍTICO para análisis por producto
  @Prop({ type: [SupplierPurchaseItemSchema], required: true })
  items: SupplierPurchaseItem[];

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
    requestedBy?: string;
    approvedBy?: string;
    warehouseId?: string;
  };
}

export type SupplierTransactionHistoryDocument = SupplierTransactionHistory &
  Document;
export const SupplierTransactionHistorySchema = SchemaFactory.createForClass(
  SupplierTransactionHistory,
);

// Indexes compuestos para búsquedas eficientes
SupplierTransactionHistorySchema.index({
  tenantId: 1,
  supplierId: 1,
  orderDate: -1,
});
SupplierTransactionHistorySchema.index({
  tenantId: 1,
  productIds: 1,
  orderDate: -1,
});
SupplierTransactionHistorySchema.index({
  tenantId: 1,
  productCategories: 1,
  orderDate: -1,
});
SupplierTransactionHistorySchema.index({
  tenantId: 1,
  status: 1,
  orderDate: -1,
});
