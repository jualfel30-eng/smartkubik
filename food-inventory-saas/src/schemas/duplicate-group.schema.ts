import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type DuplicateGroupDocument = DuplicateGroup & Document;

export const DUPLICATE_GROUP_STATUSES = [
  "pending",
  "reviewed",
  "merged",
  "dismissed",
] as const;

export type DuplicateGroupStatus =
  (typeof DUPLICATE_GROUP_STATUSES)[number];

export const MATCH_TYPES = [
  "barcode_exact",
  "sku_exact",
  "name_fuzzy",
  "name_brand_size",
  "composite",
] as const;

export type MatchType = (typeof MATCH_TYPES)[number];

@Schema()
export class CompletenessScore {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  score: number;

  @Prop({ type: [String], default: [] })
  missingFields: string[];
}

@Schema()
export class ProductSummary {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: String })
  sku: string;

  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  brand: string;

  @Prop({ type: Number, default: 0 })
  variantCount: number;

  @Prop({ type: Boolean, default: false })
  hasPrice: boolean;

  @Prop({ type: Boolean, default: false })
  hasCost: boolean;

  @Prop({ type: Boolean, default: false })
  hasBarcode: boolean;

  @Prop({ type: Boolean, default: false })
  hasInventory: boolean;

  @Prop({ type: Number, default: 0 })
  totalStock: number;

  @Prop({ type: Number, default: 0 })
  orderCount: number;
}

@Schema({ timestamps: true })
export class DuplicateGroup {
  @Prop({ type: String, required: true })
  scanId: string;

  @Prop({
    type: String,
    required: true,
    enum: DUPLICATE_GROUP_STATUSES,
    default: "pending",
  })
  status: DuplicateGroupStatus;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  confidenceScore: number;

  @Prop({
    type: String,
    required: true,
    enum: MATCH_TYPES,
  })
  matchType: MatchType;

  @Prop({ type: String })
  matchDetails: string;

  @Prop({
    type: [{ type: Types.ObjectId, ref: "Product" }],
    required: true,
  })
  productIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: "Product" })
  suggestedMasterId?: Types.ObjectId;

  @Prop({ type: [Object], default: [] })
  completenessScores: CompletenessScore[];

  @Prop({ type: [Object], default: [] })
  productSummaries: ProductSummary[];

  // Standard fields
  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;
}

export const DuplicateGroupSchema =
  SchemaFactory.createForClass(DuplicateGroup);

DuplicateGroupSchema.index({ tenantId: 1, scanId: 1 });
DuplicateGroupSchema.index({
  tenantId: 1,
  status: 1,
  confidenceScore: -1,
});
DuplicateGroupSchema.index({ productIds: 1, tenantId: 1 });
DuplicateGroupSchema.index({ tenantId: 1, createdAt: -1 });
