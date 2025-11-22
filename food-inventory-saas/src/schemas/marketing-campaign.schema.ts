import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type MarketingCampaignDocument = MarketingCampaign & Document;

@Schema({ timestamps: true })
export class MarketingCampaign {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  organizationId?: Types.ObjectId;

  // Campaign Details
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({
    required: true,
    enum: ["email", "sms", "whatsapp", "push"],
  })
  channel: string;

  @Prop({
    required: true,
    enum: ["manual", "automated"],
  })
  type: string;

  // Campaign Content
  @Prop()
  subject?: string; // For email

  @Prop({ required: true })
  message: string;

  @Prop()
  htmlContent?: string; // Rich HTML email content

  @Prop()
  emailTemplateId?: string; // Reference to email template

  @Prop([String]) // Image URLs, attachments
  media?: string[];

  @Prop([
    {
      url: String,
      name: String,
      size: Number,
      type: String,
    },
  ])
  attachments?: Array<{
    url: string;
    name: string;
    size: number;
    type: string;
  }>;

  // Targeting & CRM Integration
  @Prop({ type: Object })
  targetSegment?: {
    customerType?: string[]; // 'vip', 'regular', 'new', 'inactive'
    tags?: string[];
    location?: string[];
    minSpent?: number;
    maxSpent?: number;
    lastVisitDays?: number; // Days since last visit
    visitCount?: { min?: number; max?: number };
    ageRange?: { min?: number; max?: number };
    includeCustomerIds?: string[];
    excludeCustomerIds?: string[];
  };

  @Prop()
  targetAudience?: string; // Description of target audience

  @Prop([{ type: Types.ObjectId, ref: "Customer" }])
  recipients?: Types.ObjectId[];

  @Prop({ default: 0 })
  estimatedReach?: number; // Calculated based on segment criteria

  // Scheduling
  @Prop({ type: Date })
  scheduledDate?: Date;

  @Prop({ default: false })
  isRecurring: boolean;

  @Prop()
  recurringPattern?: string; // 'daily', 'weekly', 'monthly'

  // Automation Triggers
  @Prop()
  trigger?: string; // 'birthday', 'anniversary', 'inactive_30_days', 'after_visit', etc.

  @Prop({ type: Object })
  triggerConfig?: Record<string, any>;

  // Campaign Status
  @Prop({
    enum: ["draft", "scheduled", "running", "completed", "cancelled", "paused"],
    default: "draft",
    index: true,
  })
  status: string;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  // Performance Metrics
  @Prop({ default: 0 })
  totalSent: number;

  @Prop({ default: 0 })
  totalDelivered: number;

  @Prop({ default: 0 })
  totalOpened: number;

  @Prop({ default: 0 })
  totalClicked: number;

  @Prop({ default: 0 })
  totalConverted: number; // Made a reservation/order

  @Prop({ default: 0 })
  totalFailed: number;

  @Prop({ default: 0 })
  totalUnsubscribed: number;

  // Budget & ROI
  @Prop()
  budget?: number;

  @Prop({ default: 0 })
  spent: number;

  @Prop({ default: 0 })
  revenue: number; // Revenue generated from campaign

  // Configuration
  @Prop({ type: Object })
  settings?: Record<string, any>;

  // Email Service Provider Configuration
  @Prop({ type: Object })
  emailConfig?: {
    provider?: string; // 'sendgrid', 'mailgun', 'ses', 'smtp', 'gmail'
    fromEmail?: string;
    fromName?: string;
    replyTo?: string;
    trackOpens?: boolean;
    trackClicks?: boolean;
    testMode?: boolean;
  };

  // SMS Service Provider Configuration
  @Prop({ type: Object })
  smsConfig?: {
    provider?: string; // 'twilio', 'vonage', 'sns', 'plivo'
    fromNumber?: string;
    testMode?: boolean;
  };

  // WhatsApp Configuration
  @Prop({ type: Object })
  whatsappConfig?: {
    provider?: string; // 'whapi', 'twilio', 'messagebird'
    fromNumber?: string;
    testMode?: boolean;
  };

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop()
  notes?: string;
}

export const MarketingCampaignSchema =
  SchemaFactory.createForClass(MarketingCampaign);

// Indexes
MarketingCampaignSchema.index({ tenantId: 1, status: 1 });
MarketingCampaignSchema.index({ tenantId: 1, channel: 1 });
MarketingCampaignSchema.index({ tenantId: 1, type: 1 });
MarketingCampaignSchema.index({ tenantId: 1, scheduledDate: 1 });
