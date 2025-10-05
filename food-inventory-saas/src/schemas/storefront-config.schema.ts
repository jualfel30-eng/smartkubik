import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type StorefrontConfigDocument = StorefrontConfig & Document;

@Schema()
export class ThemeConfig {
  @Prop({ type: String, required: true, default: '#FB923C' })
  primaryColor: string;

  @Prop({ type: String, required: true, default: '#F97316' })
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

  @Prop({ type: String })
  description?: string;

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
}

const SocialMediaConfigSchema = SchemaFactory.createForClass(SocialMediaConfig);

@Schema()
export class ContactInfoConfig {
  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  address?: string;
}

const ContactInfoConfigSchema = SchemaFactory.createForClass(ContactInfoConfig);

@Schema({ timestamps: true })
export class StorefrontConfig {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isActive: boolean;

  @Prop({ type: String, required: true })
  domain: string;

  @Prop({ type: ThemeConfigSchema, default: () => ({}) })
  theme: ThemeConfig;

  @Prop({ type: String, enum: ['ecommerce', 'services'], default: 'ecommerce' })
  templateType: string;

  @Prop({ type: String })
  customCSS?: string;

  @Prop({ type: SeoConfigSchema, default: () => ({}) })
  seo: SeoConfig;

  @Prop({ type: SocialMediaConfigSchema, default: () => ({}) })
  socialMedia: SocialMediaConfig;

  @Prop({ type: ContactInfoConfigSchema, default: () => ({}) })
  contactInfo: ContactInfoConfig;
}

export const StorefrontConfigSchema = SchemaFactory.createForClass(StorefrontConfig);

// Índices
StorefrontConfigSchema.index({ tenantId: 1, domain: 1 }, { unique: true });
StorefrontConfigSchema.index({ tenantId: 1 });
StorefrontConfigSchema.index({ domain: 1 });

// Métodos estáticos
StorefrontConfigSchema.statics.findByTenant = function(tenantId: Types.ObjectId) {
  return this.findOne({ tenantId });
};

StorefrontConfigSchema.statics.findActiveDomain = function(domain: string) {
  return this.findOne({ domain, isActive: true });
};
