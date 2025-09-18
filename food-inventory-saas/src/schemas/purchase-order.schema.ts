import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PurchaseOrderDocument = PurchaseOrder & Document;

@Schema()
export class PurchaseOrderStatusHistory {
  @Prop({ required: true })
  status: string;

  @Prop({ required: true, default: Date.now })
  changedAt: Date;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  changedBy: Types.ObjectId;

  @Prop()
  notes?: string;
}

@Schema()
export class PurchaseOrderItem {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  productSku: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  costPrice: number; // Costo al momento de la compra

  @Prop({ required: true })
  totalCost: number;

  @Prop()
  lotNumber?: string;

  @Prop()
  expirationDate?: Date;
}

@Schema({ timestamps: true })
export class PurchaseOrder {
  @Prop({ required: true, unique: true })
  poNumber: string; // Purchase Order Number

  @Prop({ type: Types.ObjectId, ref: "Supplier", required: true })
  supplierId: Types.ObjectId;

  @Prop({ required: true })
  supplierName: string;

  @Prop({ required: true })
  purchaseDate: Date;

  @Prop()
  expectedDeliveryDate?: Date;

  @Prop([PurchaseOrderItem])
  items: PurchaseOrderItem[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true, default: "pending" })
  status: string; // pending, ordered, partially-received, received, cancelled

  @Prop([PurchaseOrderStatusHistory])
  history: PurchaseOrderStatusHistory[];

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);
