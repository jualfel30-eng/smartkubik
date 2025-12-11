import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type InventoryDocument = Inventory & Document;
export type InventoryLotDocument = InventoryLot & Document;
export type InventoryMovementDocument = InventoryMovement & Document;

@Schema({ _id: false })
export class InventoryAttributeCombination {
  @Prop({ type: Object, required: true })
  attributes: Record<string, any>;

  @Prop({ type: Number, required: true, default: 0 })
  totalQuantity: number;

  @Prop({ type: Number, required: true, default: 0 })
  availableQuantity: number;

  @Prop({ type: Number, required: true, default: 0 })
  reservedQuantity: number;

  @Prop({ type: Number, required: true, default: 0 })
  committedQuantity: number;

  @Prop({ type: Number })
  averageCostPrice?: number;
}
export const InventoryAttributeCombinationSchema = SchemaFactory.createForClass(
  InventoryAttributeCombination,
);

@Schema({ timestamps: true })
export class InventoryLot {
  @Prop({ type: String, required: true })
  lotNumber: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  availableQuantity: number;

  @Prop({ type: Number, required: true })
  reservedQuantity: number;

  @Prop({ type: Number, required: true })
  costPrice: number;

  @Prop({ type: Date, required: true })
  receivedDate: Date;

  @Prop({ type: Date })
  expirationDate?: Date;

  @Prop({ type: Date })
  manufacturingDate?: Date;

  @Prop({ type: Types.ObjectId, ref: "Supplier" })
  supplierId?: Types.ObjectId;

  @Prop({ type: String })
  supplierInvoice?: string;

  @Prop({ type: String, required: true, default: "available" })
  status: string;

  @Prop({ type: Object })
  qualityCheck?: {
    checkedBy: Types.ObjectId;
    checkedAt: Date;
    temperature: number;
    humidity: number;
    visualInspection: string;
    approved: boolean;
    notes?: string;
  };

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;
}
export const InventoryLotSchema = SchemaFactory.createForClass(InventoryLot);

@Schema({ timestamps: true })
export class Inventory {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Warehouse" })
  warehouseId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  productSku: string;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: Types.ObjectId, ref: "ProductVariant" })
  variantId?: Types.ObjectId;

  @Prop({ type: String })
  variantSku?: string;

  @Prop({ type: Number, required: true })
  totalQuantity: number;

  @Prop({ type: Number, required: true })
  availableQuantity: number;

  @Prop({ type: Number, required: true })
  reservedQuantity: number;

  @Prop({ type: Number, required: true })
  committedQuantity: number;

  @Prop({ type: Number, required: true })
  averageCostPrice: number;

  @Prop({ type: Number, required: true })
  lastCostPrice: number;

  @Prop({ type: [InventoryLotSchema] })
  lots: InventoryLot[];

  @Prop({ type: Object, default: {} })
  attributes?: Record<string, any>;

  @Prop({
    type: [InventoryAttributeCombinationSchema],
    default: [],
  })
  attributeCombinations?: InventoryAttributeCombination[];

  @Prop({ type: Object })
  location: {
    warehouse: string;
    zone: string;
    aisle: string;
    shelf: string;
    bin: string;
  };

  @Prop({ type: Object })
  alerts: {
    lowStock: boolean;
    nearExpiration: boolean;
    expired: boolean;
    overstock: boolean;
    lastAlertSent?: Date;
  };

  @Prop({ type: Object })
  metrics: {
    turnoverRate: number;
    daysOnHand: number;
    lastSaleDate?: Date;
    averageDailySales: number;
    seasonalityFactor: number;
  };

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

@Schema({ timestamps: true })
export class InventoryMovement {
  @Prop({ type: Types.ObjectId, ref: "Inventory", required: true })
  inventoryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Warehouse" })
  warehouseId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  productSku: string;

  @Prop({ type: String })
  lotNumber?: string;

  @Prop({ type: String, required: true })
  movementType: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  unitCost: number;

  @Prop({ type: Number, required: true })
  totalCost: number;

  @Prop({ type: String })
  reason: string;

  @Prop({ type: String })
  reference?: string;

  @Prop({ type: Types.ObjectId, ref: "Order" })
  orderId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Supplier" })
  supplierId?: Types.ObjectId;

  @Prop({ type: Object })
  balanceAfter: {
    totalQuantity: number;
    availableQuantity: number;
    reservedQuantity: number;
    averageCostPrice: number;
  };

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);
export const InventoryMovementSchema =
  SchemaFactory.createForClass(InventoryMovement);

// Índices para optimizar consultas de inventario
InventorySchema.index(
  { tenantId: 1, productId: 1 },
  {
    unique: true,
    partialFilterExpression: { variantId: { $exists: false } },
    name: "tenant_product_unique_without_variant",
  },
);
InventorySchema.index({ tenantId: 1, warehouseId: 1, productId: 1 });
InventorySchema.index(
  { tenantId: 1, productId: 1, variantId: 1 },
  {
    unique: true,
    partialFilterExpression: { variantId: { $exists: true } },
    name: "tenant_product_variant_unique",
  },
);
InventorySchema.index({ productSku: 1, tenantId: 1 });
InventorySchema.index({ variantSku: 1, tenantId: 1 });
InventorySchema.index({ availableQuantity: 1, tenantId: 1 });
InventorySchema.index({ "alerts.lowStock": 1, tenantId: 1 });
InventorySchema.index({ "alerts.nearExpiration": 1, tenantId: 1 });
InventorySchema.index({ "alerts.expired": 1, tenantId: 1 });
InventorySchema.index({ "lots.expirationDate": 1, tenantId: 1 });
InventorySchema.index({ "lots.status": 1, tenantId: 1 });
InventorySchema.index({ "location.warehouse": 1, tenantId: 1 });
InventoryMovementSchema.index({ tenantId: 1, createdAt: -1 });
InventoryMovementSchema.index({ tenantId: 1, warehouseId: 1, productId: 1, createdAt: -1 });

// Índices para movimientos de inventario
InventoryMovementSchema.index({ inventoryId: 1, createdAt: -1 });
InventoryMovementSchema.index({ productId: 1, createdAt: -1, tenantId: 1 });
InventoryMovementSchema.index({ movementType: 1, createdAt: -1, tenantId: 1 });
InventoryMovementSchema.index({ orderId: 1, tenantId: 1 });
InventoryMovementSchema.index({ supplierId: 1, createdAt: -1, tenantId: 1 });
InventoryMovementSchema.index({ createdAt: -1, tenantId: 1 });
InventoryMovementSchema.index({ lotNumber: 1, tenantId: 1 });
