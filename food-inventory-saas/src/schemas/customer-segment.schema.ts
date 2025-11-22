import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CustomerSegmentDocument = CustomerSegment & Document;

@Schema({ timestamps: true })
export class CustomerSegment {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  organizationId?: Types.ObjectId;

  // Segment Details
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  color?: string; // For visual identification

  @Prop()
  icon?: string;

  // Segmentation Criteria
  @Prop({ type: Object, required: true })
  criteria: {
    // Customer Type
    customerType?: string[]; // 'vip', 'regular', 'new', 'inactive', 'churned'

    // Tags & Categories
    tags?: string[];
    categories?: string[];

    // Demographics
    location?: string[];
    city?: string[];
    country?: string[];
    ageRange?: { min?: number; max?: number };
    gender?: string[];

    // Behavioral Criteria
    minSpent?: number; // Total lifetime spent
    maxSpent?: number;
    minOrderValue?: number; // Average order value
    maxOrderValue?: number;
    visitCount?: { min?: number; max?: number };
    lastVisitDays?: number; // Days since last visit
    lastVisitDateRange?: { start?: Date; end?: Date };

    // Engagement
    emailEngagement?: string; // 'high', 'medium', 'low', 'none'
    smsEngagement?: string;
    openRate?: { min?: number; max?: number }; // % open rate
    clickRate?: { min?: number; max?: number }; // % click rate

    // Preferences
    preferredChannel?: string[]; // 'email', 'sms', 'whatsapp', 'push'
    hasSubscribedToMarketing?: boolean;

    // Custom Fields
    customFields?: Record<string, any>;

    // Advanced Filters
    includeCustomerIds?: string[]; // Manually added customers
    excludeCustomerIds?: string[]; // Manually excluded customers

    // Date Filters
    registeredDateRange?: { start?: Date; end?: Date };
    birthdayMonth?: number[]; // [1-12] for birthday campaigns
    anniversaryMonth?: number[]; // [1-12] for anniversary campaigns
  };

  // Dynamic Segment (auto-updates)
  @Prop({ default: true })
  isDynamic: boolean; // If true, recalculates members based on criteria

  // Static Segment Members (for non-dynamic segments)
  @Prop([{ type: Types.ObjectId, ref: "Customer" }])
  staticMembers?: Types.ObjectId[];

  // Segment Statistics
  @Prop({ default: 0 })
  memberCount: number; // Current member count

  @Prop({ type: Date })
  lastCalculatedAt?: Date; // When member count was last calculated

  @Prop({ type: Object })
  stats?: {
    avgLifetimeValue?: number;
    avgOrderValue?: number;
    avgVisitCount?: number;
    totalRevenue?: number;
    engagementRate?: number;
  };

  // Status
  @Prop({
    enum: ["active", "inactive", "archived"],
    default: "active",
  })
  status: string;

  // Usage Tracking
  @Prop({ default: 0 })
  usageCount: number; // How many campaigns used this segment

  @Prop({ type: Date })
  lastUsedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop()
  notes?: string;
}

export const CustomerSegmentSchema =
  SchemaFactory.createForClass(CustomerSegment);

// Indexes
CustomerSegmentSchema.index({ tenantId: 1, status: 1 });
CustomerSegmentSchema.index({ tenantId: 1, isDynamic: 1 });
CustomerSegmentSchema.index({ tenantId: 1, name: 1 });
