import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsObject,
  IsArray,
} from "class-validator";

export type StorefrontConfigDocument = StorefrontConfig & Document;

@Schema()
export class ThemeConfig {
  @Prop({ type: String, required: true, default: "#3B82F6" })
  primaryColor: string;

  @Prop({ type: String, required: true, default: "#10B981" })
  secondaryColor: string;

  @Prop({ type: String })
  logo?: string;

  @Prop({ type: String })
  favicon?: string;

  @Prop({ type: String })
  bannerUrl?: string;

  @Prop({ type: String })
  videoUrl?: string;
}
const ThemeConfigSchema = SchemaFactory.createForClass(ThemeConfig);

@Schema()
export class SeoConfig {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  keywords: string[];
}
const SeoConfigSchema = SchemaFactory.createForClass(SeoConfig);

@Schema()
export class SocialMediaConfig {
  @Prop({ type: String })
  facebook?: string;

  @Prop({ type: String })
  instagram?: string;

  @Prop({ type: String })
  whatsapp?: string;

  @Prop({ type: String })
  twitter?: string;

  @Prop({ type: String })
  linkedin?: string;
}
const SocialMediaConfigSchema = SchemaFactory.createForClass(SocialMediaConfig);

@Schema()
export class ContactInfoConfig {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  phone: string;

  @Prop({ type: Object })
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
  };
}
const ContactInfoConfigSchema = SchemaFactory.createForClass(ContactInfoConfig);

@Schema()
export class WhatsAppIntegrationConfig {
  @IsBoolean()
  @IsOptional()
  @Prop({ type: Boolean, default: false })
  enabled: boolean;

  @IsString()
  @IsOptional()
  @Prop({ type: String })
  businessPhone?: string; // WhatsApp Business phone number

  @IsString()
  @IsOptional()
  @Prop({ type: String })
  buttonText?: string; // Custom button text (default: "Ver en WhatsApp")

  @IsString()
  @IsOptional()
  @Prop({ type: String })
  messageTemplate?: string; // Template for the storefront link message

  @IsBoolean()
  @IsOptional()
  @Prop({ type: Boolean, default: true })
  autoSendOrderConfirmation: boolean; // Auto-send order confirmation via WhatsApp

  @IsBoolean()
  @IsOptional()
  @Prop({ type: Boolean, default: true })
  sendPaymentInstructions: boolean; // Send payment details via WhatsApp

  @IsBoolean()
  @IsOptional()
  @Prop({ type: Boolean, default: true })
  sendDeliveryUpdates: boolean; // Send delivery status updates
}
const WhatsAppIntegrationConfigSchema = SchemaFactory.createForClass(
  WhatsAppIntegrationConfig,
);

@Schema({ timestamps: true })
export class StorefrontConfig {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Boolean, required: true, default: false })
  isActive: boolean;

  @Prop({ type: String, required: true })
  domain: string;

  @Prop({ type: ThemeConfigSchema, required: true })
  theme: ThemeConfig;

  @Prop({
    type: String,
    enum: ["ecommerce", "services", "beauty", "premium", "restaurant"],
    required: true,
    default: "ecommerce",
  })
  templateType: string;

  @Prop({ type: String })
  customCSS?: string;

  @Prop({ type: SeoConfigSchema, required: true })
  seo: SeoConfig;

  @Prop({ type: SocialMediaConfigSchema })
  socialMedia?: SocialMediaConfig;

  @Prop({ type: ContactInfoConfigSchema, required: true })
  contactInfo: ContactInfoConfig;

  @Prop({ type: WhatsAppIntegrationConfigSchema })
  whatsappIntegration?: WhatsAppIntegrationConfig;

  @Prop({ type: String })
  googlePlaceId?: string;

  @Prop({ type: Object })
  beautyConfig?: {
    enabled: boolean;
    businessHours: Array<{
      day: number;
      start: string;
      end: string;
      isOpen: boolean;
    }>;
    bookingSettings: {
      slotDuration: number;
      maxAdvanceBookingDays: number;
      minAdvanceBookingHours: number;
      whatsappNotification: {
        enabled: boolean;
        mode: string;
      };
    };
    paymentMethods: string[];
    loyalty: {
      enabled: boolean;
    };
  };

  // ==================== RESTAURANT-SPECIFIC CONFIG ====================
  @Prop({ type: Object })
  restaurantConfig?: {
    enabled: boolean;

    // Branding
    restaurantName?: string;
    tagline?: string;
    logoUrl?: string;
    heroVideoUrl?: string;
    heroImageUrl?: string;

    // Pedidos
    whatsappNumber?: string;        // Número destino de los pedidos (formato: 584141234567)
    paymentInstructions?: string;   // Instrucciones de pago que se muestran en checkout
    currency?: string;              // "USD", "VES", "COP"

    // Tema visual (sobreescribe StorefrontConfig.theme para el template restaurant)
    accentColor?: string;           // Hex ej: "#FF4500" — mapea a CSS var(--accent)

    // Horario visible en el storefront (informativo, no bloquea pedidos)
    businessHours?: Array<{
      day: number;     // 0=domingo
      open: string;    // "11:00"
      close: string;   // "22:00"
      isOpen: boolean;
    }>;
  };
}

export const StorefrontConfigSchema =
  SchemaFactory.createForClass(StorefrontConfig);

// Índices para optimizar consultas
StorefrontConfigSchema.index({ tenantId: 1, domain: 1 }, { unique: true });
StorefrontConfigSchema.index({ tenantId: 1 });
StorefrontConfigSchema.index({ domain: 1 });
StorefrontConfigSchema.index({ isActive: 1, tenantId: 1 });

// Métodos estáticos
StorefrontConfigSchema.statics.findByTenant = function (
  tenantId: Types.ObjectId,
) {
  return this.findOne({ tenantId }).exec();
};

StorefrontConfigSchema.statics.findActiveDomain = function (domain: string) {
  return this.findOne({ domain, isActive: true }).exec();
};
