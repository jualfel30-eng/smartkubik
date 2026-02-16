import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductPriceListDocument = ProductPriceList & Document;

/**
 * Schema para relacionar productos con listas de precios y sus precios personalizados
 * Permite asignar precios específicos a cada variante en diferentes listas
 */
@Schema({ timestamps: true })
export class ProductPriceList {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  variantSku: string; // SKU de la variante específica

  @Prop({ type: Types.ObjectId, ref: 'PriceList', required: true, index: true })
  priceListId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  customPrice: number; // Precio personalizado para esta lista

  @Prop({ default: true })
  isActive: boolean;

  // Metadata del precio
  @Prop()
  notes?: string; // Notas sobre este precio específico

  @Prop({ type: Date })
  validFrom?: Date;

  @Prop({ type: Date })
  validUntil?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastUpdatedBy?: Types.ObjectId;

  @Prop()
  lastUpdatedByName?: string;

  // Timestamps automáticos
}

export const ProductPriceListSchema = SchemaFactory.createForClass(ProductPriceList);

// Índices compuestos para queries eficientes
ProductPriceListSchema.index({ productId: 1, priceListId: 1 });
ProductPriceListSchema.index({ variantSku: 1, priceListId: 1 }, { unique: true });
ProductPriceListSchema.index({ tenantId: 1, priceListId: 1 });
ProductPriceListSchema.index({ tenantId: 1, isActive: 1 });
