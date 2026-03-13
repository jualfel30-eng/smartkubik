import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TransferOrderDocument = TransferOrder & Document;

export enum TransferOrderStatus {
  DRAFT = "draft",
  REQUESTED = "requested",
  APPROVED = "approved",
  IN_TRANSIT = "in_transit",
  RECEIVED = "received",
  PARTIALLY_RECEIVED = "partially_received",
  CANCELLED = "cancelled",
}

@Schema({ _id: false })
export class TransferOrderItem {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: String })
  productSku?: string;

  @Prop({ type: String })
  productName?: string;

  @Prop({ type: Types.ObjectId })
  variantId?: Types.ObjectId;

  @Prop({ type: String })
  variantSku?: string;

  @Prop({ type: Number, required: true, min: 0.0001 })
  requestedQuantity: number;

  @Prop({ type: Number })
  approvedQuantity?: number;

  @Prop({ type: Number })
  shippedQuantity?: number;

  @Prop({ type: Number })
  receivedQuantity?: number;

  @Prop({ type: Number, default: 0 })
  unitCost?: number;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: String })
  lotNumber?: string;
}

const TransferOrderItemSchema =
  SchemaFactory.createForClass(TransferOrderItem);

@Schema({ timestamps: true })
export class TransferOrder {
  @Prop({ type: String, required: true })
  orderNumber: string;

  @Prop({
    type: String,
    enum: Object.values(TransferOrderStatus),
    default: TransferOrderStatus.DRAFT,
  })
  status: TransferOrderStatus;

  // Cross-tenant transfer support (optional — backwards compatible)
  @Prop({ type: Types.ObjectId, ref: "Tenant" })
  sourceTenantId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant" })
  destinationTenantId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "BusinessLocation" })
  sourceLocationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Warehouse", required: true })
  sourceWarehouseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "BusinessLocation" })
  destinationLocationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Warehouse", required: true })
  destinationWarehouseId: Types.ObjectId;

  @Prop({ type: [TransferOrderItemSchema], default: [] })
  items: TransferOrderItem[];

  // Status metadata
  @Prop({ type: Types.ObjectId, ref: "User" })
  requestedBy?: Types.ObjectId;

  @Prop({ type: Date })
  requestedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  shippedBy?: Types.ObjectId;

  @Prop({ type: Date })
  shippedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  receivedBy?: Types.ObjectId;

  @Prop({ type: Date })
  receivedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  cancelledBy?: Types.ObjectId;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: String })
  cancellationReason?: string;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: String })
  reference?: string;

  // Standard fields
  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const TransferOrderSchema =
  SchemaFactory.createForClass(TransferOrder);

TransferOrderSchema.index(
  { tenantId: 1, orderNumber: 1 },
  { unique: true },
);
TransferOrderSchema.index({ tenantId: 1, status: 1 });
TransferOrderSchema.index({ tenantId: 1, sourceLocationId: 1 });
TransferOrderSchema.index({ tenantId: 1, destinationLocationId: 1 });
TransferOrderSchema.index({ tenantId: 1, createdAt: -1 });
TransferOrderSchema.index({ sourceTenantId: 1, status: 1 }, { sparse: true });
TransferOrderSchema.index(
  { destinationTenantId: 1, status: 1 },
  { sparse: true },
);
