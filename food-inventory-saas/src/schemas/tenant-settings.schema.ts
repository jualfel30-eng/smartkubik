import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TenantSettingsDocument = TenantSettings & Document;

@Schema({ timestamps: true })
export class TenantSettings {
  @Prop({
    type: Types.ObjectId,
    ref: "Tenant",
    required: true,
    unique: true,
    index: true,
  })
  tenantId: Types.ObjectId;

  // Email Service Provider Settings
  @Prop({ type: Object })
  emailProvider?: {
    active: boolean;
    provider: string; // 'sendgrid', 'mailgun', 'ses', 'smtp', 'gmail'

    // SendGrid Configuration
    sendgridApiKey?: string;

    // Mailgun Configuration
    mailgunApiKey?: string;
    mailgunDomain?: string;
    mailgunRegion?: string; // 'us' or 'eu'

    // Amazon SES Configuration
    sesAccessKeyId?: string;
    sesSecretAccessKey?: string;
    sesRegion?: string;

    // SMTP Configuration
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpUser?: string;
    smtpPassword?: string;

    // Gmail OAuth Configuration
    gmailClientId?: string;
    gmailClientSecret?: string;
    gmailRefreshToken?: string;
    gmailAccessToken?: string;

    // Default sender
    defaultFromEmail?: string;
    defaultFromName?: string;
    defaultReplyTo?: string;

    // Features
    trackOpens?: boolean;
    trackClicks?: boolean;
    enableUnsubscribe?: boolean;
  };

  // SMS Service Provider Settings
  @Prop({ type: Object })
  smsProvider?: {
    active: boolean;
    provider: string; // 'twilio', 'vonage', 'sns', 'plivo'

    // Twilio Configuration
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioFromNumber?: string;
    twilioMessagingServiceSid?: string;

    // Vonage/Nexmo Configuration
    vonageApiKey?: string;
    vonageApiSecret?: string;
    vonageFromNumber?: string;

    // Amazon SNS Configuration
    snsAccessKeyId?: string;
    snsSecretAccessKey?: string;
    snsRegion?: string;
    snsFromNumber?: string;

    // Plivo Configuration
    plivoAuthId?: string;
    plivoAuthToken?: string;
    plivoFromNumber?: string;

    // SMS Credits (if using prepaid service)
    credits?: number;
    creditsUsed?: number;
  };

  // WhatsApp Service Provider Settings
  @Prop({ type: Object })
  whatsappProvider?: {
    active: boolean;
    provider: string; // 'whapi', 'twilio', 'messagebird', 'cloud-api'

    // Whapi Configuration
    whapiToken?: string;
    whapiInstanceId?: string;

    // Twilio WhatsApp Configuration
    twilioWhatsappNumber?: string;

    // MessageBird Configuration
    messageBirdApiKey?: string;
    messageBirdChannelId?: string;

    // WhatsApp Cloud API Configuration
    cloudApiToken?: string;
    cloudApiPhoneNumberId?: string;
    cloudApiBusinessAccountId?: string;
  };

  // Push Notification Settings
  @Prop({ type: Object })
  pushProvider?: {
    active: boolean;
    provider: string; // 'firebase', 'onesignal', 'pushwoosh'

    // Firebase Configuration
    firebaseServerKey?: string;
    firebaseProjectId?: string;

    // OneSignal Configuration
    oneSignalAppId?: string;
    oneSignalApiKey?: string;

    // Pushwoosh Configuration
    pushwooshAppCode?: string;
    pushwooshApiToken?: string;
  };

  // Marketing Compliance Settings
  @Prop({ type: Object })
  compliance?: {
    gdprEnabled?: boolean;
    canSpamEnabled?: boolean;
    unsubscribeLink?: string;
    companyAddress?: string;
    privacyPolicyUrl?: string;
    termsOfServiceUrl?: string;
  };

  // Marketing Limits & Quotas
  @Prop({ type: Object })
  limits?: {
    maxEmailsPerDay?: number;
    maxSmsPerDay?: number;
    maxWhatsappPerDay?: number;
    emailsUsedToday?: number;
    smsUsedToday?: number;
    whatsappUsedToday?: number;
    lastResetDate?: Date;
  };

  // Advanced Features
  @Prop({ type: Object })
  features?: {
    enableABTesting?: boolean;
    enableAutomation?: boolean;
    enableSegmentation?: boolean;
    enableAnalytics?: boolean;
  };
}

export const TenantSettingsSchema =
  SchemaFactory.createForClass(TenantSettings);

// Indexes
TenantSettingsSchema.index({ tenantId: 1 }, { unique: true });
