import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Schema para combos/paquetes de servicios de belleza
 * Ejemplo: "Combo Ejecutivo" = Corte + Barba + Lavado a $20 (vs $25 individual)
 * DISTINTO de ServicePackage (módulo appointments general)
 */
@Schema({ timestamps: true })
export class BeautyPackage {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'BeautyService' }], required: true })
  services: Types.ObjectId[];

  @Prop({ type: Number, required: true, min: 5 })
  totalDuration: number;

  @Prop({
    type: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, enum: ['USD', 'VES', 'COP', 'EUR'], default: 'USD' },
    },
    required: true,
    _id: false,
  })
  price: { amount: number; currency: string };

  @Prop({ type: Number, default: 0, min: 0 })
  savings: number;

  @Prop({ type: String })
  image?: string;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export type BeautyPackageDocument = BeautyPackage & Document;
export const BeautyPackageSchema = SchemaFactory.createForClass(BeautyPackage);

BeautyPackageSchema.index({ tenantId: 1, isActive: 1, sortOrder: 1 });
BeautyPackageSchema.index({ tenantId: 1, isDeleted: 1 });
BeautyPackageSchema.index({ tenantId: 1, createdAt: -1 });
