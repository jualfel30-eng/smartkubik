import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  organizationId?: Types.ObjectId;

  // Source Information
  @Prop({
    required: true,
    enum: ["google", "tripadvisor", "yelp", "facebook", "internal", "manual"],
    index: true,
  })
  source: string;

  @Prop() // External ID from the platform
  externalId?: string;

  @Prop() // URL to the review on the platform
  sourceUrl?: string;

  // Customer Information
  @Prop({ required: true })
  customerName: string;

  @Prop()
  customerEmail?: string;

  @Prop()
  customerPhone?: string;

  @Prop()
  customerAvatar?: string;

  @Prop({ type: Types.ObjectId, ref: "Customer" })
  customerId?: Types.ObjectId;

  // Review Content
  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop()
  title?: string;

  @Prop({ required: true })
  comment: string;

  @Prop({ type: Date, index: true })
  reviewDate: Date;

  // Categories (e.g., food, service, ambiance, value)
  @Prop({ type: Map, of: Number }) // { food: 5, service: 4, ambiance: 5, value: 4 }
  categoryRatings?: Map<string, number>;

  // Sentiment Analysis (can be auto-generated via AI)
  @Prop({ enum: ["positive", "neutral", "negative"] })
  sentiment?: string;

  @Prop() // Confidence score 0-1
  sentimentScore?: number;

  @Prop([String]) // Extracted keywords/topics
  topics?: string[];

  // Response Management
  @Prop()
  response?: string;

  @Prop({ type: Date })
  responseDate?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  respondedBy?: Types.ObjectId;

  @Prop({ default: false })
  isResponded: boolean;

  // Status & Flags
  @Prop({
    enum: ["pending", "reviewed", "flagged", "archived"],
    default: "pending",
    index: true,
  })
  status: string;

  @Prop({ default: false })
  isFlagged: boolean; // For reviews that need attention

  @Prop()
  flagReason?: string;

  @Prop({ default: false })
  isPublic: boolean; // Whether to display publicly

  @Prop({ default: false })
  isVerified: boolean; // Verified customer (actually dined)

  // Order/Reservation Reference
  @Prop({ type: Types.ObjectId, ref: "Order" })
  orderId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Reservation" })
  reservationId?: Types.ObjectId;

  // Metadata
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop([String])
  tags?: string[];

  @Prop()
  notes?: string; // Internal notes
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Indexes
ReviewSchema.index({ tenantId: 1, reviewDate: -1 });
ReviewSchema.index({ tenantId: 1, rating: 1 });
ReviewSchema.index({ tenantId: 1, source: 1 });
ReviewSchema.index({ tenantId: 1, status: 1 });
ReviewSchema.index({ tenantId: 1, sentiment: 1 });
ReviewSchema.index({ tenantId: 1, isResponded: 1 });
