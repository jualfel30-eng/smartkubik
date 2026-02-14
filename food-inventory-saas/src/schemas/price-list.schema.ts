import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PriceListDocument = PriceList & Document;

/**
 * Schema para listas de precios múltiples
 * Permite crear diferentes listas de precios para distintos segmentos
 * (mayoristas, retail, VIP, promociones, etc.)
 */
@Schema({ timestamps: true })
export class PriceList {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // "Precio Mayorista", "Precio VIP", "Black Friday"

  @Prop()
  description?: string;

  @Prop({
    required: true,
    enum: ['standard', 'wholesale', 'retail', 'promotional', 'seasonal', 'custom'],
    default: 'standard',
  })
  type: string;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ type: Date })
  startDate?: Date; // Fecha de inicio (para promociones temporales)

  @Prop({ type: Date })
  endDate?: Date; // Fecha de fin (para promociones temporales)

  @Prop({ default: 0 })
  priority: number; // Mayor número = mayor prioridad (para resolver conflictos)

  // Configuración de aplicación automática
  @Prop({
    type: Object,
    default: {},
  })
  autoApplyRules?: {
    customerTypes?: string[]; // ['wholesale', 'vip']
    minimumOrderAmount?: number;
    locations?: Types.ObjectId[];
  };

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true })
  createdByName: string;

  // Timestamps automáticos
}

export const PriceListSchema = SchemaFactory.createForClass(PriceList);

// Índices
PriceListSchema.index({ tenantId: 1, isActive: 1 });
PriceListSchema.index({ tenantId: 1, type: 1 });
PriceListSchema.index({ startDate: 1, endDate: 1 });
