import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PerformanceKpiDocument = PerformanceKpi & Document;

@Schema({ timestamps: true })
export class PerformanceKpi {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  date: Date;

  @Prop({ type: Number, required: true })
  totalSales: number;

  @Prop({ type: Number, required: true })
  numberOfOrders: number;

  @Prop({ type: Number, required: true })
  totalHoursWorked: number;

  @Prop({ type: Number, required: true })
  salesPerHour: number;

  @Prop({ type: Object })
  salesByChannel?: Record<string, number>;
}

export const PerformanceKpiSchema =
  SchemaFactory.createForClass(PerformanceKpi);

// Compound index to ensure one KPI entry per user per day for a tenant
PerformanceKpiSchema.index(
  { userId: 1, date: 1, tenantId: 1 },
  { unique: true },
);
