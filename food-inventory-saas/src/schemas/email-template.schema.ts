import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EmailTemplateDocument = EmailTemplate & Document;

@Schema({ timestamps: true })
export class EmailTemplate {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  organizationId?: Types.ObjectId;

  // Template Details
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  category?: string; // 'promotional', 'transactional', 'newsletter', 'announcement'

  @Prop({ default: false })
  isDefault: boolean; // Is this a default/system template

  // Template Content
  @Prop()
  subject?: string;

  @Prop()
  preheader?: string; // Email preview text

  @Prop({ required: true })
  htmlContent: string; // Rich HTML content

  @Prop()
  textContent?: string; // Plain text fallback

  // Template Variables/Placeholders
  @Prop([String])
  variables?: string[]; // ['{{customer_name}}', '{{offer_details}}', etc.]

  // Design Settings
  @Prop({ type: Object })
  design?: {
    layout?: string; // 'single-column', 'two-column', 'newsletter'
    theme?: string; // 'light', 'dark', 'custom'
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    backgroundColor?: string;
    headerImage?: string;
    footerText?: string;
    logoUrl?: string;
  };

  // Social Media Links
  @Prop({ type: Object })
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };

  // Template Status
  @Prop({
    enum: ["draft", "active", "archived"],
    default: "draft",
  })
  status: string;

  // Usage Statistics
  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ type: Date })
  lastUsedAt?: Date;

  // Version Control
  @Prop({ default: 1 })
  version: number;

  @Prop({ type: Types.ObjectId, ref: "EmailTemplate" })
  previousVersionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  lastModifiedBy?: Types.ObjectId;

  @Prop()
  tags?: string[];

  @Prop()
  notes?: string;
}

export const EmailTemplateSchema = SchemaFactory.createForClass(EmailTemplate);

// Indexes
EmailTemplateSchema.index({ tenantId: 1, status: 1 });
EmailTemplateSchema.index({ tenantId: 1, category: 1 });
EmailTemplateSchema.index({ tenantId: 1, isDefault: 1 });
