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

  @Prop({ type: String })
  instructions?: string;

  @Prop({ type: Object })
  details?: {
    bank?: string;
    accountNumber?: string;
    accountName?: string;
    cid?: string;
    phoneNumber?: string;
    email?: string;
  };
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
    enableAutomaticIngredientDeduction: boolean; // NUEVO: Deducir ingredientes automáticamente al vender
  };

  @Prop({ type: Object })
  orders: {
    reservationExpiryMinutes: number;
    autoConfirmOrders: boolean;
    requirePaymentConfirmation: boolean;
    allowPartialPayments: boolean;
    defaultPaymentTerms: number;
    productViewType?: 'search' | 'grid' | 'list';
    gridColumns?: number; // 2, 3, 4, 6
    showProductImages?: boolean;
    showProductDescription?: boolean;
    enableCategoryFilter?: boolean;
  };

  @Prop({ type: Object })
  calendarConfig?: {
    provider?: string;
    watch?: {
      channelId?: string;
      resourceId?: string;
      expiration?: Date;
      address?: string;
    };
    reminders?: {
      email?: boolean;
      whatsapp?: boolean;
    };
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

  @Prop({ type: String, default: "standard" })
  invoiceFormat: string; // 'standard' | 'thermal'

  @Prop({ type: String, default: 'logistics' })
  fulfillmentStrategy?: 'logistics' | 'hybrid' | 'immediate' | 'counter';

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
  shipping?: {
    enabled: boolean;
    activeProviders: string[]; // Array of provider codes (e.g., ['MRW-VE', 'ZOOM-VE'])
    defaultProvider?: string;
  };

  @Prop({ type: Object })
  payroll?: {
    baseCurrency?: string;
    defaultPaySchedule?: "monthly" | "biweekly" | "weekly";
    defaultPayDay?: number;
    allowCustomFrequencies?: boolean;
    payablesMode?: "aggregated" | "per_employee";
    notificationEmails?: string[] | string;
    thirteenthMonthPolicy?: {
      enabled: boolean;
      calculationMethod?: "full_salary" | "proportional";
      referenceDays?: number;
    };
    statutoryContributions?: {
      ivssRate?: number;
      paroForzosoRate?: number;
      faovRate?: number;
      housingPolicyRate?: number;
    };
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

  @Prop({ type: Object })
  tips?: {
    autoDistribute?: boolean;
    distributionFrequency?: "daily" | "weekly" | "biweekly" | "monthly";
    defaultDistributionDay?: number; // 1-7 for day of week, 1-31 for day of month
    poolingEnabled?: boolean;
    taxWithholdingEnabled?: boolean;
    taxWithholdingRate?: number;
    minimumDistributionAmount?: number;
    notificationEnabled?: boolean;
  };

  @Prop({ type: Object })
  reservations?: {
    maxPartySize?: number;
    defaultDuration?: number; // minutes
    advanceBookingDays?: number;
    cancellationWindowHours?: number;
    requireDeposit?: boolean;
    depositAmount?: number;
    autoConfirmReservations?: boolean;
    sendConfirmationEmail?: boolean;
    sendReminderEmail?: boolean;
    reminderHoursBefore?: number;
  };

  @Prop({ type: Object })
  loyalty?: {
    pointsPerDollar?: number; // Puntos ganados por cada dólar gastado (default: 1)
    pointsValue?: number; // Valor en dólares de cada punto (default: 0.01)
    minimumPointsToRedeem?: number; // Mínimo de puntos para redimir (default: 100)
    pointsExpirationDays?: number; // Días hasta que expiran los puntos (0 = nunca, default: 365)
    notifyOnPointsEarned?: boolean; // Notificar al cliente cuando gana puntos
    notifyOnPointsExpiring?: boolean; // Notificar cuando puntos están por expirar
  };

  @Prop({ type: Object })
  billingPreferences?: {
    defaultDeliveryMethod: "print" | "email" | "whatsapp" | "none";
    autoPrintCopies: number;
    enabledMethods: string[];
    printers?: {
      receiptPrinterIp?: string;
    };
  };
}

const TenantSettingsSchema = SchemaFactory.createForClass(TenantSettings);

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  ownerFirstName?: string;

  @Prop({ type: String })
  ownerLastName?: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, required: true })
  businessType: string;

  @Prop({
    type: String,
    enum: [
      "FOOD_SERVICE",
      "RETAIL",
      "SERVICES",
      "LOGISTICS",
      "HYBRID",
      "MANUFACTURING",
    ],
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
    payroll?: boolean;
    bankAccounts?: boolean;
    hrCore?: boolean;
    timeAndAttendance?: boolean;
    tips?: boolean; // Core module for all verticals (Tips for Food Service)
    commissions?: boolean; // General Commissions module for sales
    cashRegister?: boolean; // Cash register sessions and closings (Cierre de Caja)

    // Communication & Marketing modules
    chat?: boolean;
    marketing?: boolean;

    // FOOD_SERVICE specific modules
    restaurant?: boolean;
    tables?: boolean;
    recipes?: boolean;
    kitchenDisplay?: boolean;
    menuEngineering?: boolean;
    reservations?: boolean;

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

    // MANUFACTURING specific modules
    production?: boolean;
    bom?: boolean;
    routing?: boolean;
    workCenters?: boolean;
    mrp?: boolean;
    qualityControl?: boolean;
    maintenance?: boolean;
    productionScheduling?: boolean;
    shopFloorControl?: boolean;
    traceability?: boolean;
    costing?: boolean;
    plm?: boolean;
    capacityPlanning?: boolean;
    compliance?: boolean;
  };

  @Prop({ type: Object, default: {} })
  featureFlags?: Record<string, boolean>;

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
      provider: {
        type: String,
        enum: ["none", "gmail", "outlook", "resend", "smtp"],
        default: "none",
      },
      enabled: { type: Boolean, default: false },
      // Gmail OAuth
      gmailAccessToken: { type: String },
      gmailRefreshToken: { type: String },
      gmailEmail: { type: String },
      // Outlook OAuth
      outlookAccessToken: { type: String },
      outlookRefreshToken: { type: String },
      outlookEmail: { type: String },
      // Resend
      resendApiKey: { type: String },
      resendFromEmail: { type: String },
      // SMTP Manual
      smtpHost: { type: String },
      smtpPort: { type: Number },
      smtpSecure: { type: Boolean },
      smtpUser: { type: String },
      smtpPass: { type: String },
      smtpFrom: { type: String },
      smtpReplyTo: { type: String },
    },
    default: {
      provider: "none",
      enabled: false,
    },
  })
  emailConfig?: {
    provider: "none" | "gmail" | "outlook" | "resend" | "smtp";
    enabled: boolean;
    // Gmail OAuth
    gmailAccessToken?: string;
    gmailRefreshToken?: string;
    gmailEmail?: string;
    // Outlook OAuth
    outlookAccessToken?: string;
    outlookRefreshToken?: string;
    outlookEmail?: string;
    // Resend
    resendApiKey?: string;
    resendFromEmail?: string;
    // SMTP Manual
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpUser?: string;
    smtpPass?: string;
    smtpFrom?: string;
    smtpReplyTo?: string;
  };

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
