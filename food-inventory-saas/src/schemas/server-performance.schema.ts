import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ServerPerformanceDocument = ServerPerformance & Document;

@Schema({ timestamps: true })
export class ServerPerformance extends Document {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  serverId: Types.ObjectId; // Mesero/camarero

  @Prop({ type: String, required: true })
  serverName: string; // Denormalizado

  @Prop({ type: Date, required: true, index: true })
  date: Date; // Fecha del turno

  @Prop({ type: Types.ObjectId, ref: "Shift" })
  shiftId?: Types.ObjectId;

  // ========== Order Metrics ==========
  @Prop({ type: Number, default: 0 })
  ordersServed: number; // Número de órdenes atendidas

  @Prop({ type: Number, default: 0 })
  totalSales: number; // Ventas totales

  @Prop({ type: Number, default: 0 })
  averageOrderValue: number; // Valor promedio por orden

  @Prop({ type: Number, default: 0 })
  itemsSold: number; // Items vendidos

  // ========== Table Metrics ==========
  @Prop({ type: Number, default: 0 })
  tablesServed: number; // Mesas atendidas

  @Prop({ type: Number, default: 0 })
  averageTableTurnover: number; // Tiempo promedio de rotación (minutos)

  @Prop({ type: Number, default: 0 })
  guestsServed: number; // Comensales atendidos

  // ========== Tips & Revenue ==========
  @Prop({ type: Number, default: 0 })
  tipsReceived: number; // Propinas recibidas

  @Prop({ type: Number, default: 0 })
  tipPercentage: number; // Porcentaje de propina promedio

  @Prop({ type: Number, default: 0 })
  salesPerHour: number; // Ventas por hora

  // ========== Customer Satisfaction ==========
  @Prop({ type: Number, min: 0, max: 5 })
  averageRating?: number; // Calificación promedio (1-5)

  @Prop({ type: Number, default: 0 })
  ratingsCount: number; // Número de calificaciones

  @Prop({ type: Number, default: 0 })
  complaintsReceived: number; // Quejas recibidas

  @Prop({ type: Number, default: 0 })
  complimentsReceived: number; // Cumplidos recibidos

  // ========== Time Metrics ==========
  @Prop({ type: Number, default: 0 })
  hoursWorked: number; // Horas trabajadas

  @Prop({ type: Date })
  shiftStart?: Date;

  @Prop({ type: Date })
  shiftEnd?: Date;

  // ========== Efficiency ==========
  @Prop({ type: Number, default: 0 })
  orderErrorRate: number; // Tasa de error en órdenes (%)

  @Prop({ type: Number, default: 0 })
  averageServiceTime: number; // Tiempo promedio de servicio (minutos)

  @Prop({ type: Number, default: 0 })
  tablesPerHour: number; // Mesas por hora

  // ========== Product Mix ==========
  @Prop({
    type: [
      {
        category: String,
        count: Number,
        revenue: Number,
      },
    ],
  })
  productMix?: Array<{
    category: string;
    count: number;
    revenue: number;
  }>;

  // ========== Top Items ==========
  @Prop({
    type: [
      {
        productId: { type: Types.ObjectId, ref: "Product" },
        productName: String,
        quantity: Number,
        revenue: Number,
      },
    ],
  })
  topItems?: Array<{
    productId: Types.ObjectId;
    productName: string;
    quantity: number;
    revenue: number;
  }>;

  // ========== Notes & Feedback ==========
  @Prop({ type: String })
  managerNotes?: string;

  @Prop({ type: String })
  performanceGrade?: string; // A, B, C, D, F

  @Prop({ type: [String] })
  achievements?: string[]; // Logros del día: "Ventas más altas", "Mejor propinas", etc.

  // ========== Goals ==========
  @Prop({
    type: {
      salesTarget: Number,
      salesAchieved: Number,
      ordersTarget: Number,
      ordersAchieved: Number,
    },
  })
  goals?: {
    salesTarget: number;
    salesAchieved: number;
    ordersTarget: number;
    ordersAchieved: number;
  };

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const ServerPerformanceSchema =
  SchemaFactory.createForClass(ServerPerformance);

// Índices compuestos
ServerPerformanceSchema.index({ tenantId: 1, serverId: 1, date: -1 });
ServerPerformanceSchema.index({ tenantId: 1, date: -1 });
ServerPerformanceSchema.index({ tenantId: 1, shiftId: 1 });
