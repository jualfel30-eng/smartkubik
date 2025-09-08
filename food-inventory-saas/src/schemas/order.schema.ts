import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;
export type OrderItemDocument = OrderItem & Document;

@Schema()
export class OrderItemLot {
  @Prop({ required: true })
  lotNumber: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop()
  expirationDate?: Date;

  @Prop({ required: true })
  reservedAt: Date;

  @Prop()
  releasedAt?: Date;
}

@Schema()
export class OrderItem {
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
  quantity: number;

  @Prop({ required: true })
  unitPrice: number; // precio unitario sin impuestos

  @Prop({ required: true })
  totalPrice: number; // precio total sin impuestos

  @Prop({ required: true })
  costPrice: number; // precio de costo para cálculo de margen

  @Prop([OrderItemLot])
  lots: OrderItemLot[]; // lotes asignados para FEFO

  // Impuestos venezolanos
  @Prop({ required: true })
  ivaAmount: number; // monto de IVA 16%

  @Prop({ required: true })
  igtfAmount: number; // monto de IGTF 3% si aplica

  @Prop({ required: true })
  finalPrice: number; // precio final con impuestos

  @Prop({ required: true, default: 'pending' })
  status: string; // pending, reserved, allocated, picked, shipped, delivered, cancelled

  @Prop()
  notes?: string;

  @Prop({ default: Date.now })
  addedAt: Date;
}

@Schema()
export class OrderPayment {
  @Prop({ required: true })
  method: string; // cash, card, transfer, usd_cash, usd_transfer, mixed

  @Prop({ required: true })
  currency: string; // VES, USD

  @Prop({ required: true })
  amount: number;

  @Prop()
  exchangeRate?: number; // tasa de cambio si es USD

  @Prop()
  reference?: string; // referencia de transferencia o tarjeta

  @Prop()
  bank?: string;

  @Prop({ required: true, default: 'pending' })
  status: string; // pending, confirmed, failed, refunded

  @Prop()
  confirmedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  confirmedBy?: Types.ObjectId;
}

@Schema()
export class OrderShipping {
  @Prop({ required: true })
  method: string; // pickup, delivery, courier

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

  @Prop()
  scheduledDate?: Date;

  @Prop()
  deliveredDate?: Date;

  @Prop()
  trackingNumber?: string;

  @Prop()
  courierCompany?: string;

  @Prop({ required: true })
  cost: number;

  @Prop()
  notes?: string;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId;

  @Prop({ required: true })
  customerName: string;

  @Prop()
  customerEmail?: string;

  @Prop()
  customerPhone?: string;

  @Prop([OrderItem])
  items: OrderItem[];

  // Totales de la orden
  @Prop({ required: true })
  subtotal: number; // subtotal sin impuestos

  @Prop({ required: true })
  ivaTotal: number; // total de IVA 16%

  @Prop({ required: true })
  igtfTotal: number; // total de IGTF 3%

  @Prop({ required: true })
  shippingCost: number;

  @Prop({ required: true })
  discountAmount: number;

  @Prop({ required: true })
  totalAmount: number; // total final con impuestos

  // Información de pago
  @Prop([OrderPayment])
  payments: OrderPayment[];

  @Prop({ required: true, default: 'pending' })
  paymentStatus: string; // pending, partial, paid, overpaid, refunded

  // Información de envío
  @Prop({ type: OrderShipping })
  shipping?: OrderShipping;

  // Estados de la orden
  @Prop({ required: true, default: 'draft' })
  status: string; // draft, pending, confirmed, processing, shipped, delivered, cancelled, refunded

  @Prop({ required: true, default: 'online' })
  channel: string; // online, phone, whatsapp, in_store

  @Prop({ required: true, default: 'retail' })
  type: string; // retail, wholesale, b2b

  // Fechas importantes
  @Prop()
  confirmedAt?: Date;

  @Prop()
  shippedAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  cancelledAt?: Date;

  // Reservas de inventario
  @Prop({ type: Object })
  inventoryReservation: {
    reservedAt?: Date;
    expiresAt?: Date; // las reservas expiran después de X tiempo
    isReserved: boolean;
    reservationId?: string;
  };

  // Información fiscal venezolana
  @Prop({ type: Object })
  taxInfo: {
    customerTaxId?: string;
    customerTaxType?: string; // V, E, J, G
    invoiceRequired: boolean;
    invoiceNumber?: string;
    invoiceDate?: Date;
  };

  // Métricas y análisis
  @Prop({ type: Object })
  metrics: {
    totalMargin: number; // margen total de la orden
    marginPercentage: number; // porcentaje de margen
    processingTime?: number; // tiempo de procesamiento en minutos
    fulfillmentTime?: number; // tiempo de cumplimiento en minutos
  };

  @Prop()
  notes?: string;

  @Prop()
  internalNotes?: string; // notas internas no visibles al cliente

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;
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
OrderSchema.index({ 'inventoryReservation.isReserved': 1, tenantId: 1 });
OrderSchema.index({ 'inventoryReservation.expiresAt': 1, tenantId: 1 });
OrderSchema.index({ assignedTo: 1, status: 1, tenantId: 1 });
OrderSchema.index({ totalAmount: -1, createdAt: -1, tenantId: 1 });

// Índice de texto para búsqueda
OrderSchema.index({ 
  orderNumber: 'text', 
  customerName: 'text', 
  customerEmail: 'text',
  customerPhone: 'text'
});

