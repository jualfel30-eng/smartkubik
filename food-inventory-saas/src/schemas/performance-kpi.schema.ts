import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PerformanceKpiDocument = PerformanceKpi & Document;

@Schema({ timestamps: true })
export class PerformanceKpi {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, index: true })
  date: Date; // The specific day for which the KPI is calculated (set to midnight)

  @Prop({ required: true })
  totalSales: number; // Sum of totalAmount from orders

  @Prop({ required: true })
  numberOfOrders: number;

  @Prop({ required: true })
  totalHoursWorked: number;

  @Prop({ required: true })
  salesPerHour: number;

  @Prop({ type: Object })
  salesByChannel?: Record<string, number>; // e.g., { online: 500, in_store: 1200 }
}

export const PerformanceKpiSchema = SchemaFactory.createForClass(PerformanceKpi);

// Compound index to ensure one KPI entry per user per day for a tenant
PerformanceKpiSchema.index({ userId: 1, date: 1, tenantId: 1 }, { unique: true });
