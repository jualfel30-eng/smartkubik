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

  @Prop({ type: String, default: 'standard' })
  invoiceFormat: string; // 'standard' | 'thermal'

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

  @Prop({ type: Object })
  hospitalityPolicies: {
    depositRequired?: boolean;
    depositPercentage?: number;
    cancellationWindowHours?: number;
    noShowPenaltyType?: "percentage" | "fixed";
    noShowPenaltyValue?: number;
    manualNotes?: string;
  };

  @Prop({ type: Object })
  integrations?: {
    calendar?: {
      timezone?: string;
      syncWindowDays?: number;
      google?: {
        accessToken?: string;
        refreshToken?: string;
        calendarId?: string;
        enabled?: boolean;
      };
      outlook?: {
        accessToken?: string;
        refreshToken?: string;
        calendarId?: string;
        enabled?: boolean;
      };
    };
    pms?: {
      provider?: string;
      apiKey?: string;
      endpoint?: string;
      propertyCode?: string;
      enabled?: boolean;
    };
  };
}

const TenantSettingsSchema = SchemaFactory.createForClass(TenantSettings);

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
    enum: ["FOOD_SERVICE", "RETAIL", "SERVICES", "LOGISTICS", "HYBRID"],
    default: "FOOD_SERVICE",
    required: true,
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

  @Prop({
    type: {
      autoReplyEnabled: { type: Boolean, default: false },
      knowledgeBaseTenantId: { type: String, default: "" },
      model: { type: String, default: "gpt-4o-mini" },
      capabilities: {
        type: {
          knowledgeBaseEnabled: { type: Boolean, default: true },
          inventoryLookup: { type: Boolean, default: false },
          schedulingLookup: { type: Boolean, default: false },
          orderLookup: { type: Boolean, default: false },
        },
        default: {
          knowledgeBaseEnabled: true,
          inventoryLookup: false,
          schedulingLookup: false,
          orderLookup: false,
        },
      },
    },
    default: {
      autoReplyEnabled: false,
      knowledgeBaseTenantId: "",
      model: "gpt-4o-mini",
      capabilities: {
        knowledgeBaseEnabled: true,
        inventoryLookup: false,
        schedulingLookup: false,
        orderLookup: false,
      },
    },
  })
  aiAssistant?: {
    autoReplyEnabled: boolean;
    knowledgeBaseTenantId?: string;
    model?: string;
    capabilities?: {
      knowledgeBaseEnabled: boolean;
      inventoryLookup: boolean;
      schedulingLookup: boolean;
      orderLookup: boolean;
    };
  };

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

  @Prop({
    type: {
      key: { type: String, default: "food-service" },
      overrides: { type: Object, default: {} },
    },
    default: { key: "food-service", overrides: {} },
  })
  verticalProfile?: {
    key: string;
    overrides?: Record<string, any>;
  };
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

// Índices para tenants
// TenantSchema.index({ code: 1 }, { unique: true }); // Deprecated index
TenantSchema.index({ status: 1 });
TenantSchema.index({ subscriptionPlan: 1 });
TenantSchema.index({ subscriptionExpiresAt: 1 });
