import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Schema para paquetes de servicios del módulo appointments
 * Usado por service-packages y loyalty modules
 */
@Schema({ timestamps: true })
export class ServicePackage {
  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: [{
      serviceId: { type: String, required: true },
      quantity: { type: Number, default: 1 },
      offsetMinutes: { type: Number, default: 0 },
      additionalResourceIds: { type: [String], default: [] },
      optional: { type: Boolean, default: false },
    }],
    default: [],
  })
  items: Array<{
    serviceId: string;
    quantity?: number;
    offsetMinutes?: number;
    additionalResourceIds?: string[];
    optional?: boolean;
  }>;

  @Prop({ type: Number, min: 0 })
  basePrice?: number;

  @Prop({ type: Number, min: 0, max: 100 })
  baseDiscountPercentage?: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({
    type: [{
      adjustmentType: { type: String, enum: ['percentage', 'fixed'] },
      value: { type: Number },
      daysOfWeek: { type: [Number], default: [] },
      season: {
        start: String,
        end: String,
      },
      occupancyThreshold: { type: Number },
      channels: { type: [String], default: [] },
      loyaltyTiers: { type: [String], default: [] },
    }],
    default: [],
  })
  dynamicPricingRules: Array<{
    adjustmentType: 'percentage' | 'fixed';
    value: number;
    daysOfWeek?: number[];
    season?: { start: string; end: string };
    occupancyThreshold?: number;
    channels?: string[];
    loyaltyTiers?: string[];
  }>;

  @Prop({ type: Number, min: 0 })
  leadTimeMinutes?: number;

  // Used by loyalty module for tier-based discounts
  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export type ServicePackageDocument = ServicePackage & Document;
export const ServicePackageSchema = SchemaFactory.createForClass(ServicePackage);

ServicePackageSchema.index({ tenantId: 1, isActive: -1 });
ServicePackageSchema.index({ tenantId: 1, name: 1 });
