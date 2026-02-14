import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PriceHistoryDocument = PriceHistory & Document;

/**
 * Schema para registrar historial de cambios de precio
 * Permite auditoría completa de todos los cambios de pricing
 */
@Schema({ timestamps: true })
export class PriceHistory {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productSku: string;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  variantSku: string;

  @Prop({ required: true })
  variantName: string;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  // Tipo de cambio
  @Prop({ required: true, enum: ['basePrice', 'costPrice', 'wholesalePrice'] })
  field: 'basePrice' | 'costPrice' | 'wholesalePrice';

  @Prop({ required: true })
  oldValue: number;

  @Prop({ required: true })
  newValue: number;

  @Prop({ required: true })
  changePercentage: number; // % de cambio

  // Estrategia de pricing al momento del cambio
  @Prop({ type: Object })
  pricingStrategy?: {
    mode: string;
    markupPercentage?: number;
    marginPercentage?: number;
    psychologicalRounding?: string;
  };

  // Margen antes y después (solo para cambios de basePrice)
  @Prop({ type: Object })
  marginMetrics?: {
    oldMargin: number;
    newMargin: number;
    marginDelta: number;
  };

  // Usuario que hizo el cambio
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  changedBy: Types.ObjectId;

  @Prop({ required: true })
  changedByName: string;

  // Motivo del cambio (opcional)
  @Prop()
  reason?: string;

  // Origen del cambio
  @Prop({
    required: true,
    enum: ['manual', 'auto_strategy', 'bulk_import', 'api'],
  })
  changeSource: string;

  // Timestamps automáticos (createdAt, updatedAt)
}

export const PriceHistorySchema = SchemaFactory.createForClass(PriceHistory);

// Índices para queries eficientes
PriceHistorySchema.index({ productId: 1, createdAt: -1 });
PriceHistorySchema.index({ tenantId: 1, createdAt: -1 });
PriceHistorySchema.index({ variantSku: 1 });
PriceHistorySchema.index({ field: 1, createdAt: -1 });
