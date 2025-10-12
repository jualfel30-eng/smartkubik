import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * BillSplitPart Schema
 * Representa una parte individual de una cuenta dividida
 */
@Schema()
export class BillSplitPart {
  @Prop({ type: String, required: true })
  personName: string; // Nombre de la persona (ej: "Juan", "María", "Asiento 1")

  @Prop({ type: Number, required: true, min: 0 })
  amount: number; // Monto que debe pagar esta persona

  @Prop({ type: Number, default: 0, min: 0 })
  tipAmount: number; // Propina de esta persona

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number; // amount + tipAmount

  @Prop({ type: [String], default: [] })
  itemIds: string[]; // IDs de los items asignados a esta persona (si es split by items)

  @Prop({
    type: String,
    required: true,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending',
  })
  paymentStatus: string;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId; // Pago asociado cuando se completa

  @Prop({ type: Date })
  paidAt?: Date;
}
const BillSplitPartSchema = SchemaFactory.createForClass(BillSplitPart);

/**
 * BillSplit Schema
 * Representa cómo se dividió una cuenta
 * Puede ser "by person" (igual entre todos) o "by items" (cada quien paga lo suyo)
 */
@Schema({ timestamps: true })
export class BillSplit extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ type: String, required: true })
  orderNumber: string; // Denormalizado

  @Prop({
    type: String,
    required: true,
    enum: ['by_person', 'by_items', 'custom'],
    index: true,
  })
  splitType: string;

  /**
   * by_person: Se divide el total equitativamente entre N personas
   * by_items: Cada persona paga solo los items que consumió
   * custom: División personalizada manual
   */

  @Prop({ type: Number, required: true, min: 1 })
  numberOfPeople: number; // Número de personas entre las que se divide

  @Prop({ type: Number, required: true, min: 0 })
  originalAmount: number; // Total de la orden original (antes de propinas)

  @Prop({ type: Number, default: 0, min: 0 })
  totalTips: number; // Total de propinas agregadas

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number; // originalAmount + totalTips

  @Prop({ type: [BillSplitPartSchema], required: true })
  parts: BillSplitPart[]; // Las partes individuales

  @Prop({
    type: String,
    required: true,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
    index: true,
  })
  status: string;

  @Prop({ type: Date })
  completedAt?: Date; // Cuando todas las partes fueron pagadas

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId; // Mesero/cajero que creó el split

  @Prop({ type: Types.ObjectId, ref: 'Table' })
  tableId?: Types.ObjectId; // Mesa relacionada (si aplica)

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const BillSplitSchema = SchemaFactory.createForClass(BillSplit);

// Índices
BillSplitSchema.index({ tenantId: 1, orderId: 1 });
BillSplitSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
BillSplitSchema.index({ tenantId: 1, splitType: 1 });
BillSplitSchema.index({ tenantId: 1, tableId: 1, status: 1 });
BillSplitSchema.index({ orderNumber: 1 });
