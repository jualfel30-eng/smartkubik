import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Schema para programa de lealtad/fidelidad
 * Identificación por teléfono (sin requerir cuenta)
 */
@Schema({ timestamps: true })
export class BeautyLoyaltyRecord {
  // Multi-tenancy
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  // Identificador del cliente (teléfono con código país)
  @Prop({ type: String, required: true, trim: true })
  clientPhone: string; // "+584121234567"

  @Prop({ type: String, required: true, trim: true })
  clientName: string;

  // Email opcional para notificaciones
  @Prop({ type: String, trim: true })
  clientEmail?: string;

  // Balance de puntos
  @Prop({ type: Number, default: 0, min: 0 })
  points: number;

  // Historial de transacciones
  @Prop({
    type: [{
      type: { type: String, enum: ['earned', 'redeemed'], required: true },
      amount: { type: Number, required: true },
      booking: { type: Types.ObjectId, ref: 'BeautyBooking' },
      description: { type: String, required: true },
      date: { type: Date, default: Date.now }
    }],
    default: []
  })
  history: Array<{
    type: 'earned' | 'redeemed';
    amount: number;
    booking?: Types.ObjectId;
    description: string;
    date: Date;
  }>;

  // Estadísticas
  @Prop({ type: Number, default: 0 })
  totalEarned: number;

  @Prop({ type: Number, default: 0 })
  totalRedeemed: number;

  @Prop({ type: Number, default: 0 })
  totalVisits: number;

  @Prop({ type: Date })
  lastVisit?: Date;
}

export type BeautyLoyaltyRecordDocument = BeautyLoyaltyRecord & Document;
export const BeautyLoyaltyRecordSchema = SchemaFactory.createForClass(BeautyLoyaltyRecord);

// Índices
BeautyLoyaltyRecordSchema.index({ tenantId: 1, clientPhone: 1 }, { unique: true });
BeautyLoyaltyRecordSchema.index({ tenantId: 1, points: -1 });
BeautyLoyaltyRecordSchema.index({ tenantId: 1, totalVisits: -1 });
BeautyLoyaltyRecordSchema.index({ tenantId: 1, lastVisit: -1 });
