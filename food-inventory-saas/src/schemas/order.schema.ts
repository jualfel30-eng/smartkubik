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

  @Prop({ type: Object })
  attributes?: Record<string, any>;

  @Prop({ type: String })
  attributeSummary?: string;

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

  @Prop({ type: Number, default: 0 })
  discountPercentage: number; // Descuento aplicado (%)

  @Prop({ type: Number, default: 0 })
  discountAmount: number; // Monto de descuento en moneda

  @Prop({ type: String })
  discountReason?: string; // Razón del descuento (venta al mayor, cliente frecuente, etc.)

  @Prop({ type: Types.ObjectId, ref: "User" })
  discountApprovedBy?: Types.ObjectId; // Usuario que aprobó el descuento

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

  // NUEVO: Ingredientes removidos (IDs de productos raw material)
  @Prop({ type: [{ type: Types.ObjectId, ref: "Product" }], default: [] })
  removedIngredients: Types.ObjectId[];

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
  @Prop({
    type: String,
    required: true,
    enum: ["pickup", "delivery", "envio_nacional", "store"],
  })
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
  customerRif?: string; // Denormalized TaxID for persistence

  @Prop({ type: String, default: 'V' })
  taxType?: string;

  @Prop({ type: Boolean, default: false })
  customerIsSpecialTaxpayer?: boolean; // Cliente es Contribuyente Especial (retiene IVA)

  @Prop({ type: Number, default: 0 })
  ivaWithholdingPercentage?: number; // 75 o 100, según tipo de contribuyente del tenant

  @Prop({ type: Number, default: 0 })
  ivaWithholdingAmount?: number; // Monto de IVA retenido por el cliente

  @Prop({ type: String })
  customerEmail?: string;

  @Prop({ type: String })
  customerPhone?: string;

  @Prop({ type: String })
  customerAddress?: string;

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

  @Prop({ type: Number, default: 0 })
  generalDiscountPercentage: number; // Descuento general aplicado a toda la orden (%)

  @Prop({ type: String })
  generalDiscountReason?: string; // Razón del descuento general

  @Prop({ type: Types.ObjectId, ref: "User" })
  generalDiscountApprovedBy?: Types.ObjectId; // Usuario que aprobó el descuento general

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: Number, default: 0 })
  totalAmountVes: number;

  @Prop({ type: Number, default: 0 })
  paidAmount: number;

  @Prop({ type: Number, default: 0 })
  paidAmountVes: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: "Payment" }] })
  payments: Types.ObjectId[];

  @Prop({
    type: [
      {
        method: String,
        amount: Number,
        amountVes: Number,
        exchangeRate: Number,
        currency: String,
        // New fields for cash tracking
        amountTendered: Number,
        changeGiven: Number,
        changeGivenBreakdown: Object,
        reference: String,
        date: Date,
        isConfirmed: { type: Boolean, default: false },
        bankAccountId: { type: Types.ObjectId, ref: "BankAccount" },
        confirmedAt: Date,
        confirmedMethod: String, // El método final usado (puede cambiar del inicial)
      },
    ],
    default: [],
  })
  paymentRecords: Array<{
    method: string;
    amount: number;
    amountVes?: number;
    exchangeRate?: number;
    currency?: string;
    reference?: string;
    date: Date;
    isConfirmed: boolean;
    bankAccountId?: Types.ObjectId;
    confirmedAt?: Date;
    confirmedMethod?: string;
    igtf?: number;
    // Cash tender tracking
    amountTendered?: number;
    changeGiven?: number;
    changeGivenBreakdown?: {
      usd: number;
      ves: number;
      vesMethod?: string;
    };
  }>;

  @Prop({ type: String, required: true, default: "pending" })
  paymentStatus: string;

  // ========================================
  // NUEVOS CAMPOS PARA SPLIT BILLS
  // ========================================

  @Prop({ type: Boolean, default: false })
  isSplit: boolean; // Si la cuenta está dividida

  @Prop({ type: Types.ObjectId, ref: "BillSplit" })
  activeSplitId?: Types.ObjectId; // Split activo (si hay uno)

  @Prop({ type: Number, default: 0 })
  totalTipsAmount: number; // Total de propinas agregadas

  // QUICK WIN #3: Tips tracking
  @Prop({
    type: [
      {
        amount: Number,
        percentage: Number,
        method: String, // 'cash', 'card', 'percentage'
        employeeId: { type: Types.ObjectId, ref: "User" },
        employeeName: String,
        distributedAt: Date,
        notes: String,
      },
    ],
    default: [],
  })
  tipsRecords: Array<{
    amount: number;
    percentage?: number;
    method: string;
    employeeId?: Types.ObjectId;
    employeeName?: string;
    distributedAt?: Date;
    notes?: string;
  }>;

  @Prop({ type: Types.ObjectId, ref: "Table" })
  tableId?: Types.ObjectId; // Mesa asociada (para restaurantes)

  @Prop({ type: OrderShippingSchema })
  shipping?: OrderShipping;

  @Prop({ type: String, required: true, default: "draft" })
  status: string;

  @Prop({ type: String, required: true, default: "online" })
  channel: string;

  @Prop({ type: String, required: true, default: "retail" })
  type: string;

  // ========================================
  // ORDER SOURCE TRACKING (POS, Storefront, WhatsApp)
  // ========================================

  @Prop({
    type: String,
    enum: ["pos", "storefront", "whatsapp", "api", "manual"],
    default: "pos",
  })
  source: string;

  @Prop({ type: Object })
  sourceMetadata?: {
    channel?: string;
    campaignId?: Types.ObjectId;
    referralCode?: string;
    sourceUrl?: string;
    whatsappPhone?: string;
    whatsappMessageId?: string;
    storefrontDomain?: string;
    userAgent?: string;
    ipAddress?: string;
  };

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

  @Prop({ type: Types.ObjectId, ref: "User" })
  assignedWaiterId?: Types.ObjectId;

  // ========================================
  // COMISIONES (Sales Commission Tracking)
  // ========================================

  @Prop({ type: Types.ObjectId, ref: "User" })
  salesPersonId?: Types.ObjectId; // Vendedor asignado (puede ser diferente a waiter)

  @Prop({ type: Boolean, default: false })
  commissionCalculated: boolean; // ¿Ya se calculó la comisión?

  @Prop({ type: Types.ObjectId, ref: "CommissionRecord" })
  commissionRecordId?: Types.ObjectId; // Referencia al registro de comisión

  @Prop({ type: Number, default: 0 })
  commissionAmount: number; // Monto de comisión (desnormalizado para reportes)

  @Prop({ type: Boolean, default: false })
  contributesToGoals: boolean; // ¿Esta venta contribuye a metas? (default true después de procesarse)

  // ========================================
  // MARKETING: Cupones y Promociones
  // ========================================

  @Prop({ type: Object })
  appliedCoupon?: {
    couponId: Types.ObjectId;
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
  };

  @Prop({
    type: [
      {
        promotionId: { type: Types.ObjectId, ref: "Promotion" },
        name: String,
        type: String,
        discountAmount: Number,
        productsAffected: [String],
      },
    ],
    default: [],
  })
  appliedPromotions?: Array<{
    promotionId: Types.ObjectId;
    name: string;
    type: string;
    discountAmount: number;
    productsAffected: string[];
  }>;

  // ========================================
  // FULFILLMENT & DELIVERY
  // ========================================

  @Prop({
    type: String,
    enum: ['pending', 'picking', 'packed', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  })
  fulfillmentStatus: string;

  @Prop({
    type: String,
    enum: ['store', 'delivery_local', 'delivery_national', 'pickup'],
    default: 'store'
  })
  fulfillmentType: string;

  @Prop({ type: Date })
  fulfillmentDate?: Date;

  @Prop({ type: String })
  trackingNumber?: string;

  @Prop({ type: String })
  deliveryNotes?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  fulfilledBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  deliveryDriver?: Types.ObjectId;

  @Prop({ type: Date })
  driverAssignedAt?: Date;

  @Prop({ type: String })
  deliveryProofPhoto?: string;

  // ========================================
  // BILLING DOCUMENT LINK
  // ========================================

  @Prop({ type: Types.ObjectId, ref: "BillingDocument" })
  billingDocumentId?: Types.ObjectId;

  @Prop({ type: String })
  billingDocumentNumber?: string;

  @Prop({
    type: String,
    enum: ['none', 'invoice', 'delivery_note'],
    default: 'none'
  })
  billingDocumentType: string;

  // ============================================
  // INTEGRACIÓN CON CAJA REGISTRADORA
  // ============================================

  @Prop({ type: Types.ObjectId, ref: 'CashRegisterSession', default: null })
  cashSessionId: Types.ObjectId;

  @Prop({ type: String, default: null })
  cashRegisterId: string; // Nombre de la caja: "Caja 1", "Caja Principal", etc.

  @Prop({ type: String, ref: "Tenant", required: true })
  tenantId: string;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
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
OrderSchema.index({ source: 1, createdAt: -1, tenantId: 1 });

// Comisiones
OrderSchema.index({ salesPersonId: 1, createdAt: -1, tenantId: 1 });
OrderSchema.index({ commissionCalculated: 1, status: 1, tenantId: 1 });
OrderSchema.index({ commissionRecordId: 1, tenantId: 1 });

// Índice de texto para búsqueda
OrderSchema.index({
  orderNumber: "text",
  customerName: "text",
  customerEmail: "text",
  customerPhone: "text",
});

// Cash Register integration
OrderSchema.index({ cashSessionId: 1, tenantId: 1 });
