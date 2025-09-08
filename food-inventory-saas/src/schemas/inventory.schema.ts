import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryDocument = Inventory & Document;
export type InventoryLotDocument = InventoryLot & Document;
export type InventoryMovementDocument = InventoryMovement & Document;

@Schema({ timestamps: true })
export class InventoryLot {
  @Prop({ required: true })
  lotNumber: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  availableQuantity: number; // cantidad disponible (no reservada)

  @Prop({ required: true })
  reservedQuantity: number; // cantidad reservada para órdenes

  @Prop({ required: true })
  costPrice: number; // precio de costo de este lote

  @Prop({ required: true })
  receivedDate: Date;

  @Prop()
  expirationDate?: Date;

  @Prop()
  manufacturingDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  supplierId?: Types.ObjectId;

  @Prop()
  supplierInvoice?: string;

  @Prop({ required: true, default: 'available' })
  status: string; // available, reserved, expired, damaged, sold

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

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

@Schema({ timestamps: true })
export class Inventory {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productSku: string;

  @Prop({ required: true })
  productName: string;

  @Prop({ type: Types.ObjectId, ref: 'ProductVariant' })
  variantId?: Types.ObjectId;

  @Prop()
  variantSku?: string;

  @Prop({ required: true })
  totalQuantity: number;

  @Prop({ required: true })
  availableQuantity: number; // cantidad total disponible

  @Prop({ required: true })
  reservedQuantity: number; // cantidad total reservada

  @Prop({ required: true })
  committedQuantity: number; // cantidad comprometida en órdenes

  @Prop({ required: true })
  averageCostPrice: number; // precio promedio ponderado

  @Prop({ required: true })
  lastCostPrice: number; // último precio de costo

  @Prop([InventoryLot])
  lots: InventoryLot[];

  // Configuración de ubicación física
  @Prop({ type: Object })
  location: {
    warehouse: string;
    zone: string;
    aisle: string;
    shelf: string;
    bin: string;
  };

  // Alertas de inventario
  @Prop({ type: Object })
  alerts: {
    lowStock: boolean;
    nearExpiration: boolean; // productos próximos a vencer
    expired: boolean; // productos vencidos
    overstock: boolean;
    lastAlertSent?: Date;
  };

  // Métricas de rotación
  @Prop({ type: Object })
  metrics: {
    turnoverRate: number; // tasa de rotación
    daysOnHand: number; // días de inventario disponible
    lastSaleDate?: Date;
    averageDailySales: number;
    seasonalityFactor: number;
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;
}

@Schema({ timestamps: true })
export class InventoryMovement {
  @Prop({ type: Types.ObjectId, ref: 'Inventory', required: true })
  inventoryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productSku: string;

  @Prop()
  lotNumber?: string;

  @Prop({ required: true })
  movementType: string; // in, out, adjustment, transfer, reservation, release

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitCost: number;

  @Prop({ required: true })
  totalCost: number;

  @Prop()
  reason: string;

  @Prop()
  reference?: string; // número de orden, factura, etc.

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  supplierId?: Types.ObjectId;

  @Prop({ type: Object })
  balanceAfter: {
    totalQuantity: number;
    availableQuantity: number;
    reservedQuantity: number;
    averageCostPrice: number;
  };

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);
export const InventoryLotSchema = SchemaFactory.createForClass(InventoryLot);
export const InventoryMovementSchema = SchemaFactory.createForClass(InventoryMovement);

// Índices para optimizar consultas de inventario
InventorySchema.index({ productId: 1, tenantId: 1 }, { unique: true });
InventorySchema.index({ productSku: 1, tenantId: 1 });
InventorySchema.index({ variantSku: 1, tenantId: 1 });
InventorySchema.index({ availableQuantity: 1, tenantId: 1 });
InventorySchema.index({ 'alerts.lowStock': 1, tenantId: 1 });
InventorySchema.index({ 'alerts.nearExpiration': 1, tenantId: 1 });
InventorySchema.index({ 'alerts.expired': 1, tenantId: 1 });
InventorySchema.index({ 'lots.expirationDate': 1, tenantId: 1 });
InventorySchema.index({ 'lots.status': 1, tenantId: 1 });
InventorySchema.index({ 'location.warehouse': 1, tenantId: 1 });

// Índices para movimientos de inventario
InventoryMovementSchema.index({ inventoryId: 1, createdAt: -1 });
InventoryMovementSchema.index({ productId: 1, createdAt: -1, tenantId: 1 });
InventoryMovementSchema.index({ movementType: 1, createdAt: -1, tenantId: 1 });
InventoryMovementSchema.index({ orderId: 1, tenantId: 1 });
InventoryMovementSchema.index({ supplierId: 1, createdAt: -1, tenantId: 1 });
InventoryMovementSchema.index({ createdAt: -1, tenantId: 1 });
InventoryMovementSchema.index({ lotNumber: 1, tenantId: 1 });

