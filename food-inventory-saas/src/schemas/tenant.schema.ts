import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type TenantDocument = Tenant & Document;

@Schema()
export class PaymentMethodSetting {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Boolean, required: true, default: true })
  enabled: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  igtfApplicable: boolean;
}

const PaymentMethodSettingSchema =
  SchemaFactory.createForClass(PaymentMethodSetting);

@Schema()
export class TenantSettings {
  @Prop({ type: Object })
  currency: {
    primary: string;
    secondary?: string;
    exchangeRateSource: string;
    autoUpdateRate: boolean;
  };

  @Prop({ type: Object })
  taxes: {
    ivaRate: number;
    igtfRate: number;
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

  @Prop({ type: [PaymentMethodSettingSchema], default: undefined })
  paymentMethods: PaymentMethodSetting[];

  @Prop({ type: Object })
  documentTemplates: {
    invoice: {
      primaryColor: string;
      accentColor: string;
      footerText: string;
    };
    quote: {
      primaryColor: string;
      accentColor: string;
      footerText: string;
    };
  };
}

const TenantSettingsSchema =
  SchemaFactory.createForClass(TenantSettings);

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, required: true })
  businessType: string;

  @Prop({
    type: String,
    enum: ['FOOD_SERVICE', 'RETAIL', 'SERVICES', 'LOGISTICS', 'HYBRID'],
    default: 'FOOD_SERVICE',
    required: true
  })
  vertical: string;

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
    taxRegime: string;
  };

  @Prop({ type: TenantSettingsSchema })
  settings: TenantSettings;

  @Prop({ type: Object, default: {} })
  enabledModules: {
    // Core modules (available for all verticals)
    inventory?: boolean;
    orders?: boolean;
    customers?: boolean;
    suppliers?: boolean;
    reports?: boolean;
    accounting?: boolean;

    // Communication modules
    chat?: boolean;

    // FOOD_SERVICE specific modules
    tables?: boolean;
    recipes?: boolean;
    kitchenDisplay?: boolean;
    menuEngineering?: boolean;

    // RETAIL specific modules
    pos?: boolean;
    variants?: boolean;
    ecommerce?: boolean;
    loyaltyProgram?: boolean;

    // SERVICES specific modules
    appointments?: boolean;
    resources?: boolean;
    booking?: boolean;
    servicePackages?: boolean;

    // LOGISTICS specific modules
    shipments?: boolean;
    tracking?: boolean;
    routes?: boolean;
    fleet?: boolean;
    warehousing?: boolean;
    dispatch?: boolean;
  };

  @Prop({ type: String, required: true, default: "trial" })
  subscriptionPlan: string;

  @Prop({ type: Boolean, default: false })
  isConfirmed: boolean;

  @Prop({ type: String })
  confirmationCode?: string;

  @Prop({ type: Date })
  confirmationCodeExpiresAt?: Date;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: Date })
  subscriptionExpiresAt?: Date;

  @Prop({ type: String, required: true, default: "active" })
  status: string;

  @Prop({ type: String })
  suspendedReason?: string;

  @Prop({ type: Object })
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxOrders: number;
    maxStorage: number;
  };

  @Prop({ type: Object })
  usage: {
    currentUsers: number;
    currentProducts: number;
    currentOrders: number;
    currentStorage: number;
  };

  @Prop({ type: String })
  logo?: string;

  @Prop({ type: String })
  website?: string;

  @Prop({ type: String, default: "America/Caracas" })
  timezone: string;

  @Prop({ type: String, default: "es" })
  language: string;

  @Prop({ type: String, required: false })
  whapiToken?: string;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

// Índices para tenants
// TenantSchema.index({ code: 1 }, { unique: true }); // Deprecated index
TenantSchema.index({ status: 1 });
TenantSchema.index({ subscriptionPlan: 1 });
TenantSchema.index({ subscriptionExpiresAt: 1 });
