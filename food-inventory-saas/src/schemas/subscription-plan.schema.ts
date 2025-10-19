import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type SubscriptionPlanDocument = SubscriptionPlan & Document;

@Schema({ _id: false }) // _id: false because this will be a sub-document
export class SubscriptionPlanLimits {
  @Prop({ required: true, default: 0 })
  maxUsers: number;

  @Prop({ required: true, default: 0 })
  maxProducts: number;

  @Prop({ required: true, default: 0 })
  maxOrders: number; // per month

  @Prop({ required: true, default: 0 })
  maxStorage: number; // in MB
}

const SubscriptionPlanLimitsSchema = SchemaFactory.createForClass(
  SubscriptionPlanLimits,
);

@Schema({ timestamps: true })
export class SubscriptionPlan {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ required: true, default: 0 })
  price: number; // Monthly price in USD cents

  @Prop({ type: SubscriptionPlanLimitsSchema, required: true })
  limits: SubscriptionPlanLimits;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ default: true })
  isPublic: boolean; // Whether the plan is visible on the pricing page

  @Prop({ default: false })
  isArchived: boolean; // To soft-delete plans
}

export const SubscriptionPlanSchema =
  SchemaFactory.createForClass(SubscriptionPlan);

SubscriptionPlanSchema.index({ name: 1 });
SubscriptionPlanSchema.index({ isPublic: 1, isArchived: -1 });
