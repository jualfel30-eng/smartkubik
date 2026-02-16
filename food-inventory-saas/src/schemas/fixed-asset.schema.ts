import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type FixedAssetDocument = FixedAsset & Document;

export const ASSET_TYPES = [
  "equipment",
  "vehicle",
  "furniture",
  "building",
  "technology",
  "other",
] as const;

export const DEPRECIATION_METHODS = [
  "straight_line",
  "declining_balance",
] as const;

@Schema({ timestamps: true })
export class FixedAsset {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: String, required: true, enum: ASSET_TYPES })
  assetType: string;

  @Prop({ type: Number, required: true })
  acquisitionCost: number;

  @Prop({ type: Date, required: true })
  acquisitionDate: Date;

  @Prop({ type: Number, required: true })
  usefulLifeMonths: number;

  @Prop({ type: Number, default: 0 })
  residualValue: number;

  @Prop({
    type: String,
    enum: DEPRECIATION_METHODS,
    default: "straight_line",
  })
  depreciationMethod: string;

  @Prop({ type: Number, default: 0 })
  accumulatedDepreciation: number;

  @Prop({
    type: String,
    enum: ["active", "disposed", "fully_depreciated"],
    default: "active",
  })
  status: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;
}

export const FixedAssetSchema = SchemaFactory.createForClass(FixedAsset);

FixedAssetSchema.index({ tenantId: 1, status: 1 });
FixedAssetSchema.index({ tenantId: 1, assetType: 1 });
