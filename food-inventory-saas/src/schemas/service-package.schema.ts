import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type ServicePackageDocument = ServicePackage & Document;

@Schema({ _id: false })
export class ServicePackageItem {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Service",
    required: true,
  })
  serviceId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Number, default: 1 })
  quantity: number;

  @Prop({ type: Number, default: 0 })
  offsetMinutes: number;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: "Resource", default: [] })
  defaultAdditionalResourceIds: MongooseSchema.Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  optional: boolean;
}

const ServicePackageItemSchema = SchemaFactory.createForClass(ServicePackageItem);

@Schema({ _id: false })
export class DynamicPricingRule {
  @Prop({ type: String, enum: ["percentage", "fixed"], required: true })
  adjustmentType: "percentage" | "fixed";

  @Prop({ type: Number, required: true })
  value: number;

  @Prop({ type: [Number], default: [] })
  daysOfWeek?: number[];

  @Prop({
    type: Object,
    default: {},
  })
  season?: {
    start: string;
    end: string;
  };

  @Prop({ type: Number })
  occupancyThreshold?: number;

  @Prop({ type: [String], default: [] })
  channels?: string[];

  @Prop({ type: [String], default: [] })
  loyaltyTiers?: string[];
}

const DynamicPricingRuleSchema = SchemaFactory.createForClass(DynamicPricingRule);

@Schema({ timestamps: true })
export class ServicePackage {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: [ServicePackageItemSchema], default: [] })
  items: ServicePackageItem[];

  @Prop({ type: Number })
  basePrice?: number;

  @Prop({ type: Number, default: 0 })
  baseDiscountPercentage: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: [DynamicPricingRuleSchema], default: [] })
  dynamicPricingRules: DynamicPricingRule[];

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ type: Number, default: 0 })
  leadTimeMinutes: number;
}

export const ServicePackageSchema = SchemaFactory.createForClass(ServicePackage);

ServicePackageSchema.index({ tenantId: 1, isActive: 1 });
ServicePackageSchema.index({ tenantId: 1, name: 1 }, { unique: true });
