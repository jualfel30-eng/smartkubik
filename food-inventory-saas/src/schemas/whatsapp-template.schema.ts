import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type WhatsAppTemplateDocument = WhatsAppTemplate & Document;

// Template component types
export interface TemplateHeader {
  type: "text" | "image" | "video" | "document";
  content?: string; // For text headers
  mediaUrl?: string; // For media headers
  example?: string[]; // Example values for variables
}

export interface TemplateBody {
  text: string;
  examples?: string[][]; // Example values for variables (array of arrays for multiple examples)
}

export interface TemplateFooter {
  text: string;
}

export interface TemplateButton {
  type: "quick_reply" | "url" | "phone_number";
  text: string;
  url?: string; // For URL buttons, can contain {{1}} variable
  phoneNumber?: string; // For phone buttons
  example?: string[]; // Example values for URL variables
}

@Schema({ timestamps: true })
export class WhatsAppTemplate {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  // Template identification
  @Prop({ type: String, required: true, index: true })
  name: string; // Internal name (lowercase, no spaces)

  @Prop({ type: String, required: true })
  displayName: string; // Display name for UI

  @Prop({
    type: String,
    enum: ["marketing", "utility", "authentication"],
    required: true,
    default: "marketing",
  })
  category: string;

  @Prop({ type: String, required: true, default: "en" })
  language: string; // Language code (e.g., "en", "es", "pt_BR")

  // Meta/WhatsApp status
  @Prop({
    type: String,
    enum: ["draft", "pending", "approved", "rejected"],
    default: "draft",
    required: true,
    index: true,
  })
  status: string;

  @Prop({ type: String }) // Meta's template ID after approval
  metaTemplateId?: string;

  @Prop({ type: String }) // Rejection reason if rejected
  rejectionReason?: string;

  @Prop({ type: Date }) // When submitted to Meta
  submittedAt?: Date;

  @Prop({ type: Date }) // When approved/rejected by Meta
  reviewedAt?: Date;

  // Template components
  @Prop({ type: Object })
  header?: TemplateHeader;

  @Prop({ type: Object, required: true })
  body: TemplateBody;

  @Prop({ type: Object })
  footer?: TemplateFooter;

  @Prop({ type: [Object], default: [] })
  buttons: TemplateButton[];

  // Variables extracted from template
  @Prop({ type: [String], default: [] })
  variables: string[]; // List of variable names like ["1", "2", "3"] for {{1}}, {{2}}, {{3}}

  // Usage tracking
  @Prop({ type: Number, default: 0 })
  usageCount: number;

  @Prop({ type: Date })
  lastUsedAt?: Date;

  // Template settings
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>; // Additional custom fields
}

export const WhatsAppTemplateSchema =
  SchemaFactory.createForClass(WhatsAppTemplate);

// Indexes
WhatsAppTemplateSchema.index(
  { tenantId: 1, name: 1, language: 1 },
  { unique: true },
);
WhatsAppTemplateSchema.index({ tenantId: 1, status: 1 });
WhatsAppTemplateSchema.index({ tenantId: 1, category: 1 });
WhatsAppTemplateSchema.index({ metaTemplateId: 1 }, { sparse: true });
