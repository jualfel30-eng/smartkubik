import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * CustomerProductAffinity - Cache de afinidad cliente-producto
 *
 * Este schema es una vista materializada/cache que invierte la relación
 * de ProductAffinity para queries eficientes por cliente.
 *
 * Propósito:
 * - Query rápida: "¿Qué productos compra frecuentemente este cliente?"
 * - Scores de afinidad pre-calculados (0-100)
 * - Predicciones de próxima compra
 * - Recomendaciones personalizadas
 *
 * Actualización:
 * - Cron job diario recalcula todos los scores
 * - También se actualiza en tiempo real al registrar transacciones
 */
@Schema({ timestamps: true })
export class CustomerProductAffinity {
  @Prop({ type: Types.ObjectId, ref: "Customer", required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ required: true })
  customerName: string;

  @Prop({ type: Types.ObjectId, ref: "Product", required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop()
  productCode?: string;

  @Prop()
  productCategory?: string;

  // AFFINITY SCORE (0-100)
  // Calculado basado en:
  // - Frecuencia de compra (40%)
  // - Recencia (30%)
  // - Cantidad comprada (20%)
  // - Consistencia (10%)
  @Prop({ required: true, index: true })
  affinityScore: number; // 0-100

  // PURCHASE METRICS
  @Prop({ required: true })
  purchaseCount: number; // Total de veces que compró este producto

  @Prop({ required: true })
  totalQuantityPurchased: number;

  @Prop({ required: true })
  totalSpent: number;

  @Prop({ required: true })
  averageQuantity: number; // Cantidad promedio por compra

  @Prop({ required: true })
  averageOrderValue: number; // Gasto promedio por orden

  // DATES
  @Prop({ required: true })
  firstPurchaseDate: Date;

  @Prop({ required: true })
  lastPurchaseDate: Date;

  // FREQUENCY ANALYSIS
  @Prop({ required: true })
  purchaseFrequencyDays: number; // Cada cuántos días compra (promedio)

  @Prop()
  nextPredictedPurchaseDate?: Date; // Predicción de próxima compra

  @Prop({ type: Number })
  daysSinceLastPurchase?: number; // Días desde última compra

  // SEGMENTATION
  @Prop({
    type: String,
    enum: ["new", "occasional", "regular", "frequent", "champion"],
    index: true,
  })
  customerSegment: string;

  // new: 1-2 compras
  // occasional: 3-5 compras
  // regular: 6-10 compras
  // frequent: 11-20 compras
  // champion: 20+ compras

  @Prop({
    type: String,
    enum: ["very_high", "high", "medium", "low", "at_risk"],
    index: true,
  })
  engagementLevel: string;

  // very_high: compró en últimos 7 días
  // high: compró en últimos 30 días
  // medium: compró en últimos 90 días
  // low: compró en últimos 180 días
  // at_risk: más de 180 días sin comprar

  // TRENDS
  @Prop({ type: String, enum: ["increasing", "stable", "decreasing"] })
  purchaseTrend?: string; // Tendencia de compra

  @Prop({ type: Number })
  trendPercentage?: number; // % de cambio en compras (últimos 3 meses vs anteriores)

  // METADATA
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  lastCalculated: Date; // Última vez que se calculó el score

  @Prop({ type: Object })
  metadata?: {
    lastTransactionId?: string;
    calculationVersion?: string; // Para tracking de algoritmo
  };
}

export type CustomerProductAffinityDocument = CustomerProductAffinity &
  Document;
export const CustomerProductAffinitySchema = SchemaFactory.createForClass(
  CustomerProductAffinity,
);

// Compound indexes for efficient queries
CustomerProductAffinitySchema.index(
  { tenantId: 1, customerId: 1, productId: 1 },
  { unique: true },
); // Primary key

CustomerProductAffinitySchema.index({
  tenantId: 1,
  customerId: 1,
  affinityScore: -1,
}); // Top products by customer

CustomerProductAffinitySchema.index({
  tenantId: 1,
  productId: 1,
  affinityScore: -1,
}); // Top customers by product

CustomerProductAffinitySchema.index({
  tenantId: 1,
  customerSegment: 1,
  affinityScore: -1,
}); // Segment analysis

CustomerProductAffinitySchema.index({
  tenantId: 1,
  engagementLevel: 1,
}); // Engagement tracking

CustomerProductAffinitySchema.index({
  tenantId: 1,
  nextPredictedPurchaseDate: 1,
}); // Repurchase campaigns

CustomerProductAffinitySchema.index({
  tenantId: 1,
  productCategory: 1,
  affinityScore: -1,
}); // Category affinity
