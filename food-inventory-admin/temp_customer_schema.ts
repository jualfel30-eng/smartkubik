import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema()
export class CustomerAddress {
  @Prop({ required: true })
  type: string; // billing, shipping, both

  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  state: string;

  @Prop()
  zipCode?: string;

  @Prop({ required: true, default: 'Venezuela' })
  country: string;

  @Prop({ type: Object })
  coordinates?: {
    lat: number;
    lng: number;
  };

  @Prop({ default: false })
  isDefault: boolean;

  @Prop()
  notes?: string;
}

@Schema()
export class CustomerContact {
  @Prop({ required: true })
  type: string; // phone, email, whatsapp

  @Prop({ required: true })
  value: string;

  @Prop({ default: false })
  isPrimary: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  notes?: string;
}

@Schema()
export class CustomerPaymentMethod {
  @Prop({ required: true })
  type: string; // cash, card, transfer, usd_cash, usd_transfer

  @Prop()
  bank?: string;

  @Prop()
  accountNumber?: string; // últimos 4 dígitos

  @Prop()
  cardType?: string; // visa, mastercard, etc.

  @Prop({ default: false })
  isPreferred: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

@Schema()
export class CustomerSegment {
  @Prop({ required: true })
  name: string; // VIP, Regular, Wholesale, New, Inactive

  @Prop()
  description?: string;

  @Prop({ required: true })
  assignedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedBy: Types.ObjectId;

  @Prop()
  criteria?: string; // criterio usado para la segmentación
}

@Schema()
export class CustomerInteraction {
  @Prop({ required: true })
  type: string; // call, email, whatsapp, visit, complaint, compliment

  @Prop({ required: true })
  channel: string; // phone, email, whatsapp, in_person, web

  @Prop({ required: true })
  subject: string;

  @Prop()
  description?: string;

  @Prop({ required: true, default: 'completed' })
  status: string; // pending, in_progress, completed, cancelled

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  handledBy: Types.ObjectId;

  @Prop()
  followUpDate?: Date;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  customerNumber: string; // número único del cliente

  @Prop({ required: true })
  name: string;

  @Prop()
  lastName?: string;

  @Prop()
  companyName?: string;

  @Prop({ required: true })
  customerType: string; // individual, business, supplier, employee, admin, manager

  // Información fiscal venezolana
  @Prop({ type: Object })
  taxInfo: {
    taxId?: string; // RIF o CI
    taxType?: string; // V, E, J, G
    taxName?: string; // nombre fiscal
    isRetentionAgent?: boolean; // agente de retención
    retentionPercentage?: number; // porcentaje de retención
  };

  @Prop([CustomerAddress])
  addresses: CustomerAddress[];

  @Prop([CustomerContact])
  contacts: CustomerContact[];

  @Prop([CustomerPaymentMethod])
  paymentMethods: CustomerPaymentMethod[];

  @Prop([CustomerSegment])
  segments: CustomerSegment[];

  @Prop([CustomerInteraction])
  interactions: CustomerInteraction[];

  // Preferencias del cliente
  @Prop({ type: Object })
  preferences: {
    preferredCurrency: string; // VES, USD
    preferredPaymentMethod: string;
    preferredDeliveryMethod: string;
    communicationChannel: string; // email, whatsapp, phone
    marketingOptIn: boolean;
    invoiceRequired: boolean;
    specialInstructions?: string;
  };

  // Métricas del cliente
  @Prop({ type: Object })
  metrics: {
    totalOrders: number;
    totalSpent: number; // total gastado en VES
    totalSpentUSD: number; // total gastado en USD
    averageOrderValue: number;
    lastOrderDate?: Date;
    firstOrderDate?: Date;
    daysSinceLastOrder?: number;
    orderFrequency: number; // órdenes por mes
    lifetimeValue: number; // valor de vida del cliente
    returnRate: number; // tasa de retorno
    cancellationRate: number; // tasa de cancelación
    paymentDelayDays: number; // días promedio de retraso en pagos
  };

  // Información de crédito
  @Prop({ type: Object })
  creditInfo: {
    creditLimit: number; // límite de crédito en VES
    availableCredit: number; // crédito disponible
    paymentTerms: number; // términos de pago en días
    creditRating: string; // A, B, C, D
    lastCreditReview?: Date;
    isBlocked: boolean; // bloqueado por crédito
  };

  // Estado del cliente
  @Prop({ required: true, default: 'active' })
  status: string; // active, inactive, suspended, blocked

  @Prop()
  inactiveReason?: string;

  @Prop()
  suspendedUntil?: Date;

  @Prop()
  notes?: string;

  @Prop()
  internalNotes?: string; // notas internas no visibles al cliente

  // Información de registro
  @Prop({ required: true, default: 'manual' })
  source: string; // manual, web, whatsapp, referral, import

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  referredBy?: Types.ObjectId; // cliente que lo refirió

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId; // vendedor asignado

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  // Fechas importantes
  @Prop()
  lastContactDate?: Date;

  @Prop()
  nextFollowUpDate?: Date;

  @Prop()
  birthdayDate?: Date;

  @Prop()
  anniversaryDate?: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
