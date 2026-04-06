import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TransferOrderDocument = TransferOrder & Document;

export enum TransferRequestType {
  PUSH = "push", // Iniciada por origen (reabastecimiento)
  PULL = "pull", // Iniciada por destino (solicitud)
}

export enum TransferOrderStatus {
  DRAFT = "draft",

  // Estados específicos PUSH
  PUSH_REQUESTED = "push_requested", // Origen solicita aprobación interna
  PUSH_APPROVED = "push_approved", // Aprobada por supervisor origen

  // Estados específicos PULL
  PULL_REQUESTED = "pull_requested", // Destino solicita inventario
  PULL_APPROVED = "pull_approved", // Origen aprueba solicitud
  PULL_REJECTED = "pull_rejected", // Origen rechaza solicitud

  // Estados compartidos (post-aprobación)
  IN_PREPARATION = "in_preparation", // Origen preparando despacho
  IN_TRANSIT = "in_transit", // Despachado y en camino
  DELIVERED = "delivered", // Entregado físicamente (opcional)
  PARTIALLY_RECEIVED = "partially_received",
  RECEIVED = "received", // Confirmado por destino
  CANCELLED = "cancelled",
}

@Schema({ _id: false })
export class TransferOrderDiscrepancy {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  variantId?: Types.ObjectId;

  @Prop({ type: Number, required: true })
  expectedQuantity: number;

  @Prop({ type: Number, required: true })
  receivedQuantity: number;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({ type: [String], default: [] })
  images?: string[];
}

const TransferOrderDiscrepancySchema = SchemaFactory.createForClass(
  TransferOrderDiscrepancy,
);

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

  @Prop({ type: String })
  selectedUnit?: string;

  @Prop({ type: Number })
  conversionFactor?: number;

  @Prop({ type: String })
  unitOfMeasure?: string;
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

  @Prop({
    type: String,
    enum: Object.values(TransferRequestType),
    default: TransferRequestType.PUSH,
  })
  type: TransferRequestType;

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

  // Aprobación de solicitud PULL
  @Prop({ type: Types.ObjectId, ref: "User" })
  approvalReviewedBy?: Types.ObjectId;

  @Prop({ type: Date })
  approvalReviewedAt?: Date;

  @Prop({ type: String, enum: ["approved", "rejected"] })
  approvalDecision?: string;

  @Prop({ type: String })
  approvalNotes?: string;

  // Preparación antes de despacho
  @Prop({ type: Types.ObjectId, ref: "User" })
  inPreparationBy?: Types.ObjectId;

  @Prop({ type: Date })
  inPreparationAt?: Date;

  // Tracking información
  @Prop({ type: String })
  trackingNumber?: string;

  @Prop({ type: String })
  carrier?: string;

  @Prop({ type: Date })
  estimatedArrival?: Date;

  // Recepción con validaciones
  @Prop({ type: String })
  receiptNotes?: string;

  @Prop({ type: Boolean, default: false })
  hasDiscrepancies: boolean;

  @Prop({ type: [TransferOrderDiscrepancySchema], default: [] })
  discrepancies: TransferOrderDiscrepancy[];

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
TransferOrderSchema.index({ tenantId: 1, type: 1, status: 1 });
