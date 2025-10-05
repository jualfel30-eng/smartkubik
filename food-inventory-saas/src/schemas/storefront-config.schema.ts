import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

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
    zipCode?: string;
    country: string;
  };
}
const ContactInfoConfigSchema = SchemaFactory.createForClass(ContactInfoConfig);

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
    enum: ["ecommerce", "services"],
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
}

export const StorefrontConfigSchema = SchemaFactory.createForClass(StorefrontConfig);

// Índices para optimizar consultas
StorefrontConfigSchema.index({ tenantId: 1, domain: 1 }, { unique: true });
StorefrontConfigSchema.index({ tenantId: 1 });
StorefrontConfigSchema.index({ domain: 1 });
StorefrontConfigSchema.index({ isActive: 1, tenantId: 1 });

// Métodos estáticos
StorefrontConfigSchema.statics.findByTenant = function (tenantId: Types.ObjectId) {
  return this.findOne({ tenantId }).exec();
};

StorefrontConfigSchema.statics.findActiveDomain = function (domain: string) {
  return this.findOne({ domain, isActive: true }).exec();
};
