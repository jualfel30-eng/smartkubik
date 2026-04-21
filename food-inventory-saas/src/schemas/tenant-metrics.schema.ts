import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TenantMetricsDocument = TenantMetrics & Document;

@Schema({ timestamps: true })
export class TenantMetrics {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, unique: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Object })
  salesMetrics: {
    dailyAverage: number;
    weeklyTrend: number; // percentage change vs previous week
    monthlyTotal: number;
    topProducts: {
      productId: string;
      name: string;
      quantity: number;
      revenue: number;
    }[];
    topCustomers: {
      customerId: string;
      name: string;
      totalSpent: number;
      orderCount: number;
    }[];
    peakDayOfWeek: string; // e.g., 'martes'
    peakHour: number; // 0-23
  };

  @Prop({ type: Object })
  inventoryMetrics: {
    totalValue: number; // Total inventory value at cost
    turnoverRate: number; // Inventory turnover rate
    itemsBelowReorder: number;
    itemsExpiringSoon: number; // Next 30 days
    deadStock: {
      productId: string;
      name: string;
      daysSinceLastSale: number;
      quantity: number;
      value: number;
    }[];
  };

  @Prop({ type: Object })
  supplierMetrics: {
    averageLeadTime: number; // Days
    topSuppliers: {
      supplierId: string;
      name: string;
      orderCount: number;
      reliability: number; // 0-100% on-time delivery
      avgLeadTime: number;
    }[];
    lateDeliveryRate: number; // percentage
  };

  @Prop({ type: Object })
  aiMetrics: {
    totalEventsProcessed: number;
    totalWhatsAppInteractions: number;
    totalActionsExecuted: number;
    insightsSent: number;
    estimatedHoursSaved: number;
  };

  @Prop({ type: Date })
  lastCalculatedAt: Date;
}

export const TenantMetricsSchema =
  SchemaFactory.createForClass(TenantMetrics);
