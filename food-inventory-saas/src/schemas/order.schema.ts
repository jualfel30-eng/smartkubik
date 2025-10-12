import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type OrderDocument = Order & Document;
export type OrderItemDocument = OrderItem & Document;

@Schema()
export class OrderItemLot {
  @Prop({ type: String, required: true })
  lotNumber: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  unitPrice: number;

  @Prop({ type: Date })
  expirationDate?: Date;

  @Prop({ type: Date, required: true })
  reservedAt: Date;

  @Prop({ type: Date })
  releasedAt?: Date;
}
const OrderItemLotSchema = SchemaFactory.createForClass(OrderItemLot);

// Applied Modifier (selected by customer)
@Schema()
export class AppliedModifier {
  @Prop({ type: Types.ObjectId, ref: "Modifier", required: true })
  modifierId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string; // Guardamos el nombre por si el modificador se elimina después

  @Prop({ type: Number, required: true, default: 0 })
  priceAdjustment: number;

  @Prop({ type: Number, default: 1, min: 1 })
  quantity: number; // Para "Extra Bacon x2"
}
const AppliedModifierSchema = SchemaFactory.createForClass(AppliedModifier);

@Schema()
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  productSku: string;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: Types.ObjectId, ref: "ProductVariant" })
  variantId?: Types.ObjectId;

  @Prop({ type: String })
  variantSku?: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String })
  selectedUnit?: string; // Unidad de venta seleccionada (ej: "kg", "g", "lb")

  @Prop({ type: Number })
  conversionFactor?: number; // Factor usado para convertir a unidad base

  @Prop({ type: Number })
  quantityInBaseUnit?: number; // Cantidad convertida a unidad base (para inventario)

  @Prop({ type: Number, required: true })
  unitPrice: number; // Precio por la unidad seleccionada

  @Prop({ type: Number, required: true })
  totalPrice: number;

  @Prop({ type: Number, required: true })
  costPrice: number;

  @Prop({ type: [OrderItemLotSchema] })
  lots: OrderItemLot[];

  // NUEVO: Modifiers aplicados al item
  @Prop({ type: [AppliedModifierSchema], default: [] })
  modifiers: AppliedModifier[];

  // NUEVO: Instrucciones especiales (alergias, preferencias)
  @Prop({ type: String, trim: true })
  specialInstructions?: string;

  @Prop({ type: Number, required: true })
  ivaAmount: number;

  @Prop({ type: Number, required: true })
  igtfAmount: number;

  @Prop({ type: Number, required: true })
  finalPrice: number;

  @Prop({ type: String, required: true, default: "pending" })
  status: string;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Date, default: Date.now })
  addedAt: Date;
}
const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema()
export class OrderShipping {
  @Prop({ type: String, required: true, enum: ['pickup', 'delivery', 'envio_nacional'] })
  method: string;

  @Prop({ type: Object })
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  @Prop({ type: Date })
  scheduledDate?: Date;

  @Prop({ type: Date })
  deliveredDate?: Date;

  @Prop({ type: String })
  trackingNumber?: string;

  @Prop({ type: String })
  courierCompany?: string;

  @Prop({ type: Number, required: true, default: 0 })
  cost: number;

  @Prop({ type: Number })
  distance?: number;

  @Prop({ type: Number })
  estimatedDuration?: number;

  @Prop({ type: String })
  notes?: string;
}
const OrderShippingSchema = SchemaFactory.createForClass(OrderShipping);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: String, required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  customerId: Types.ObjectId;

  @Prop({ type: String, required: true })
  customerName: string;

  @Prop({ type: String })
  customerEmail?: string;

  @Prop({ type: String })
  customerPhone?: string;

  @Prop({ type: [OrderItemSchema] })
  items: OrderItem[];

  @Prop({ type: Number, required: true })
  subtotal: number;

  @Prop({ type: Number, required: true })
  ivaTotal: number;

  @Prop({ type: Number, required: true })
  igtfTotal: number;

  @Prop({ type: Number, required: true })
  shippingCost: number;

  @Prop({ type: Number, required: true })
  discountAmount: number;

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Payment' }] })
  payments: Types.ObjectId[];

  @Prop({ type: String, required: true, default: "pending" })
  paymentStatus: string;

  // ========================================
  // NUEVOS CAMPOS PARA SPLIT BILLS
  // ========================================

  @Prop({ type: Boolean, default: false })
  isSplit: boolean; // Si la cuenta está dividida

  @Prop({ type: Types.ObjectId, ref: 'BillSplit' })
  activeSplitId?: Types.ObjectId; // Split activo (si hay uno)

  @Prop({ type: Number, default: 0 })
  totalTipsAmount: number; // Total de propinas agregadas

  @Prop({ type: Types.ObjectId, ref: 'Table' })
  tableId?: Types.ObjectId; // Mesa asociada (para restaurantes)

  @Prop({ type: OrderShippingSchema })
  shipping?: OrderShipping;

  @Prop({ type: String, required: true, default: "draft" })
  status: string;

  @Prop({ type: String, required: true, default: "online" })
  channel: string;

  @Prop({ type: String, required: true, default: "retail" })
  type: string;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: Date })
  shippedAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: Object })
  inventoryReservation: {
    reservedAt?: Date;
    expiresAt?: Date;
    isReserved: boolean;
    reservationId?: string;
  };

  @Prop({ type: Object })
  taxInfo: {
    customerTaxId?: string;
    customerTaxType?: string;
    invoiceRequired: boolean;
    invoiceNumber?: string;
    invoiceDate?: Date;
  };

  @Prop({ type: Object })
  metrics: {
    totalMargin: number;
    marginPercentage: number;
    processingTime?: number;
    fulfillmentTime?: number;
  };

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: String })
  internalNotes?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  assignedTo?: Types.ObjectId;

  @Prop({ type: String, ref: "Tenant", required: true })
  tenantId: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Índices para optimizar consultas de órdenes
OrderSchema.index({ orderNumber: 1, tenantId: 1 }, { unique: true });
OrderSchema.index({ customerId: 1, createdAt: -1, tenantId: 1 });
OrderSchema.index({ status: 1, createdAt: -1, tenantId: 1 });
OrderSchema.index({ paymentStatus: 1, tenantId: 1 });
OrderSchema.index({ channel: 1, createdAt: -1, tenantId: 1 });
OrderSchema.index({ type: 1, createdAt: -1, tenantId: 1 });
OrderSchema.index({ createdAt: -1, tenantId: 1 });
OrderSchema.index({ confirmedAt: -1, tenantId: 1 });
OrderSchema.index({ "inventoryReservation.isReserved": 1, tenantId: 1 });
OrderSchema.index({ "inventoryReservation.expiresAt": 1, tenantId: 1 });
OrderSchema.index({ assignedTo: 1, status: 1, tenantId: 1 });
OrderSchema.index({ totalAmount: -1, createdAt: -1, tenantId: 1 });
OrderSchema.index({ tableId: 1, tenantId: 1 });
OrderSchema.index({ isSplit: 1, activeSplitId: 1, tenantId: 1 });

// Índice de texto para búsqueda
OrderSchema.index({
  orderNumber: "text",
  customerName: "text",
  customerEmail: "text",
  customerPhone: "text",
});