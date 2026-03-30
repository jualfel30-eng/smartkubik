import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Schema para reseñas/reviews de clientes
 * Requiere moderación del dueño antes de publicarse
 */
@Schema({ timestamps: true })
export class BeautyReview {
  // Multi-tenancy
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  // Referencia a la reserva (opcional)
  @Prop({ type: Types.ObjectId, ref: 'BeautyBooking' })
  booking?: Types.ObjectId;

  // Cliente (datos básicos para validación)
  @Prop({
    type: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true } // Para verificar que es cliente real
    },
    required: true,
    _id: false
  })
  client: {
    name: string;
    phone: string;
  };

  // Profesional evaluado (opcional)
  @Prop({ type: Types.ObjectId, ref: 'Professional' })
  professional?: Types.ObjectId;

  // Rating (1-5 estrellas)
  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String, trim: true })
  comment?: string;

  // Moderación
  @Prop({ type: Boolean, default: false, index: true })
  isApproved: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: String, trim: true })
  rejectionReason?: string;
}

export type BeautyReviewDocument = BeautyReview & Document;
export const BeautyReviewSchema = SchemaFactory.createForClass(BeautyReview);

// Índices
BeautyReviewSchema.index({ tenantId: 1, isApproved: 1, createdAt: -1 });
BeautyReviewSchema.index({ tenantId: 1, professional: 1 });
BeautyReviewSchema.index({ tenantId: 1, rating: 1 });
BeautyReviewSchema.index({ 'client.phone': 1, tenantId: 1 });
