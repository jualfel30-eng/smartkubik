import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantDocument = Tenant & Document;

@Schema()
export class TenantSettings {
  @Prop({ type: Object })
  currency: {
    primary: string; // VES
    secondary?: string; // USD
    exchangeRateSource: string;
    autoUpdateRate: boolean;
  };

  @Prop({ type: Object })
  taxes: {
    ivaRate: number; // 0.16
    igtfRate: number; // 0.03
    retentionRates: {
      iva: number;
      islr: number;
    };
  };

  @Prop({ type: Object })
  inventory: {
    defaultWarehouse: string;
    fefoEnabled: boolean;
    lotTrackingEnabled: boolean;
    expirationAlertDays: number;
    lowStockAlertEnabled: boolean;
    autoReorderEnabled: boolean;
  };

  @Prop({ type: Object })
  orders: {
    reservationExpiryMinutes: number;
    autoConfirmOrders: boolean;
    requirePaymentConfirmation: boolean;
    allowPartialPayments: boolean;
    defaultPaymentTerms: number;
  };

  @Prop({ type: Object })
  notifications: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    lowStockAlerts: boolean;
    expirationAlerts: boolean;
    orderAlerts: boolean;
  };
}

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, unique: true })
  code: string; // código único del tenant

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  businessType: string; // retail, wholesale, distributor, restaurant

  @Prop({ type: Object })
  contactInfo: {
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode?: string;
      country: string;
    };
  };

  @Prop({ type: Object })
  taxInfo: {
    rif: string;
    businessName: string;
    isRetentionAgent: boolean;
    taxRegime: string; // ordinario, simplificado
  };

  @Prop({ type: TenantSettings })
  settings: TenantSettings;

  @Prop({ required: true, default: 'trial' })
  subscriptionPlan: string; // trial, basic, premium, enterprise

  @Prop()
  subscriptionExpiresAt?: Date;

  @Prop({ required: true, default: 'active' })
  status: string; // active, suspended, cancelled

  @Prop()
  suspendedReason?: string;

  @Prop({ type: Object })
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxOrders: number;
    maxStorage: number; // en MB
  };

  @Prop({ type: Object })
  usage: {
    currentUsers: number;
    currentProducts: number;
    currentOrders: number;
    currentStorage: number;
  };

  @Prop()
  logo?: string;

  @Prop()
  website?: string;

  @Prop({ default: 'America/Caracas' })
  timezone: string;

  @Prop({ default: 'es' })
  language: string;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

// Índices para tenants
TenantSchema.index({ code: 1 }, { unique: true });
TenantSchema.index({ status: 1 });
TenantSchema.index({ subscriptionPlan: 1 });
TenantSchema.index({ subscriptionExpiresAt: 1 });

