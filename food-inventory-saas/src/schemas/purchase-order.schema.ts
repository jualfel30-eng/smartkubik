import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PurchaseOrderDocument = PurchaseOrder & Document;

@Schema()
export class PurchaseOrderStatusHistory {
  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: true, default: Date.now })
  changedAt: Date;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  changedBy: Types.ObjectId;

  @Prop({ type: String })
  notes?: string;
}
const PurchaseOrderStatusHistorySchema = SchemaFactory.createForClass(
  PurchaseOrderStatusHistory,
);

@Schema()
export class PurchaseOrderItem {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String, required: true })
  productSku: string;

  @Prop({ type: Types.ObjectId, ref: "ProductVariant" })
  variantId?: Types.ObjectId;

  @Prop({ type: String })
  variantName?: string;

  @Prop({ type: String })
  variantSku?: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  costPrice: number;

  @Prop({ type: Number, required: true })
  totalCost: number;

  @Prop({ type: String })
  lotNumber?: string;

  @Prop({ type: Date })
  expirationDate?: Date;
}
const PurchaseOrderItemSchema = SchemaFactory.createForClass(PurchaseOrderItem);

@Schema({ timestamps: true })
export class PurchaseOrder {
  @Prop({ type: String, required: true, unique: true })
  poNumber: string;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  supplierId: Types.ObjectId;

  @Prop({ type: String, required: true })
  supplierName: string;

  @Prop({ type: Date, required: true })
  purchaseDate: Date;

  @Prop({ type: Date })
  expectedDeliveryDate?: Date;

  @Prop({ type: [PurchaseOrderItemSchema] })
  items: PurchaseOrderItem[];

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: String, required: true, default: "pending" })
  status: string;

  @Prop({ type: [PurchaseOrderStatusHistorySchema] })
  history: PurchaseOrderStatusHistory[];

  @Prop({ type: Object })
  paymentTerms: {
    isCredit: boolean;
    creditDays: number; // Calculado desde paymentDueDate - purchaseDate
    paymentMethods: string[]; // ['efectivo', 'transferencia', 'pago_movil', 'zelle', 'binance', etc.]
    paymentDueDate?: Date; // Fecha seleccionada por el usuario
    requiresAdvancePayment: boolean;
    advancePaymentPercentage?: number;
    advancePaymentAmount?: number;
    remainingBalance?: number;
  };

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);

// Índices para optimizar consultas de purchase orders
PurchaseOrderSchema.index({ poNumber: 1, tenantId: 1 }, { unique: true });
PurchaseOrderSchema.index({ supplierId: 1, createdAt: -1, tenantId: 1 });
PurchaseOrderSchema.index({ status: 1, createdAt: -1, tenantId: 1 });
PurchaseOrderSchema.index({ purchaseDate: -1, tenantId: 1 });
PurchaseOrderSchema.index({ expectedDeliveryDate: 1, tenantId: 1 });
PurchaseOrderSchema.index({ createdAt: -1, tenantId: 1 });
PurchaseOrderSchema.index({ createdBy: 1, tenantId: 1 });

// Índice de texto para búsqueda
PurchaseOrderSchema.index({
  poNumber: "text",
  supplierName: "text",
});
