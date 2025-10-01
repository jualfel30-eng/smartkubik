import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CustomerDocument = Customer & Document;

@Schema()
export class CustomerAddress {
  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: true })
  street: string;

  @Prop({ type: String, required: true })
  city: string;

  @Prop({ type: String, required: true })
  state: string;

  @Prop({ type: String })
  zipCode?: string;

  @Prop({ type: String, required: true, default: "Venezuela" })
  country: string;

  @Prop({ type: Object })
  coordinates?: { lat: number; lng: number; };

  @Prop({ type: Boolean, default: false })
  isDefault: boolean;

  @Prop({ type: String })
  notes?: string;
}
const CustomerAddressSchema = SchemaFactory.createForClass(CustomerAddress);

@Schema()
export class CustomerContact {
  @Prop({ type: String })
  name?: string;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: true })
  value: string;

  @Prop({ type: Boolean, default: false })
  isPrimary: boolean;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String })
  notes?: string;
}
const CustomerContactSchema = SchemaFactory.createForClass(CustomerContact);

@Schema()
export class CustomerPaymentMethod {
  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String })
  bank?: string;

  @Prop({ type: String })
  accountNumber?: string;

  @Prop({ type: String })
  cardType?: string;

  @Prop({ type: Boolean, default: false })
  isPreferred: boolean;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}
const CustomerPaymentMethodSchema = SchemaFactory.createForClass(CustomerPaymentMethod);

@Schema()
export class CustomerSegment {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Date, required: true })
  assignedAt: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  assignedBy: Types.ObjectId;

  @Prop({ type: String })
  criteria?: string;
}
const CustomerSegmentSchema = SchemaFactory.createForClass(CustomerSegment);

@Schema()
export class CustomerInteraction {
  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: true })
  channel: string;

  @Prop({ type: String, required: true })
  subject: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, required: true, default: "completed" })
  status: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  handledBy: Types.ObjectId;

  @Prop({ type: Date })
  followUpDate?: Date;

  @Prop({ type: Date, required: true, default: Date.now })
  createdAt: Date;
}
const CustomerInteractionSchema = SchemaFactory.createForClass(CustomerInteraction);

@Schema({ timestamps: true })
export class Customer {
  @Prop({ type: String, required: true })
  customerNumber: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  lastName?: string;

  @Prop({ type: String })
  companyName?: string;

  @Prop({ type: String, required: true })
  customerType: string;

  @Prop({ type: Object })
  taxInfo: {
    taxId?: string;
    taxType?: string;
    taxName?: string;
    isRetentionAgent?: boolean;
    retentionPercentage?: number;
  };

  @Prop({ type: [CustomerAddressSchema] })
  addresses: CustomerAddress[];

  @Prop({ type: [CustomerContactSchema] })
  contacts: CustomerContact[];

  @Prop({ type: [CustomerPaymentMethodSchema] })
  paymentMethods: CustomerPaymentMethod[];

  @Prop({ type: [CustomerSegmentSchema] })
  segments: CustomerSegment[];

  @Prop({ type: [CustomerInteractionSchema] })
  interactions: CustomerInteraction[];

  @Prop({ type: Object })
  primaryLocation?: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    placeId?: string;
    formattedAddress?: string;
  };

  @Prop({ type: Object })
  preferences: {
    preferredCurrency: string;
    preferredPaymentMethod: string;
    preferredDeliveryMethod: string;
    communicationChannel: string;
    marketingOptIn: boolean;
    invoiceRequired: boolean;
    specialInstructions?: string;
  };

  @Prop({ type: Object })
  metrics: {
    totalOrders: number;
    totalSpent: number;
    totalSpentUSD: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
    firstOrderDate?: Date;
    daysSinceLastOrder?: number;
    orderFrequency: number;
    lifetimeValue: number;
    returnRate: number;
    cancellationRate: number;
    paymentDelayDays: number;
  };

  @Prop({ type: String })
  tier: string;

  @Prop({ type: Object })
  creditInfo: {
    creditLimit: number;
    availableCredit: number;
    paymentTerms: number;
    creditRating: string;
    lastCreditReview?: Date;
    isBlocked: boolean;
  };

  @Prop({ type: String, required: true, default: "active" })
  status: string;

  @Prop({ type: String })
  inactiveReason?: string;

  @Prop({ type: Date })
  suspendedUntil?: Date;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: String })
  internalNotes?: string;

  @Prop({ type: String, required: true, default: "manual" })
  source: string;

  @Prop({ type: Types.ObjectId, ref: "Customer" })
  referredBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Date })
  lastContactDate?: Date;

  @Prop({ type: Date })
  nextFollowUpDate?: Date;

  @Prop({ type: Date })
  birthdayDate?: Date;

  @Prop({ type: Date })
  anniversaryDate?: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Índices para optimizar consultas de clientes
CustomerSchema.index({ customerNumber: 1, tenantId: 1 }, { unique: true });
CustomerSchema.index({ email: 1, tenantId: 1 });
CustomerSchema.index({ 'taxInfo.taxId': 1, tenantId: 1 });
CustomerSchema.index({ customerType: 1, tenantId: 1 });
CustomerSchema.index({ status: 1, tenantId: 1 });
CustomerSchema.index({ tier: 1, tenantId: 1 });
CustomerSchema.index({ createdAt: -1, tenantId: 1 });
CustomerSchema.index({ 'metrics.lastOrderDate': -1, tenantId: 1 });
CustomerSchema.index({ 'metrics.totalSpent': -1, tenantId: 1 });
CustomerSchema.index({ assignedTo: 1, tenantId: 1 });
CustomerSchema.index({ nextFollowUpDate: 1, tenantId: 1 });

// Índice de texto para búsqueda
CustomerSchema.index({
  name: 'text',
  lastName: 'text',
  companyName: 'text',
  customerNumber: 'text',
});