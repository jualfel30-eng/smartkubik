import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * KitchenOrderItem Schema
 * Representa un item individual en la orden de cocina
 */
@Schema()
export class KitchenOrderItem {
  @Prop({ type: String, required: true })
  itemId: string; // ID del OrderItem original

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: [String], default: [] })
  modifiers: string[]; // ["Sin Queso", "Extra Bacon"]

  @Prop({ type: String })
  specialInstructions?: string; // "Alergia a mariscos", "Punto medio"

  @Prop({
    type: String,
    required: true,
    enum: ['pending', 'preparing', 'ready', 'served'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: Date })
  startedAt?: Date; // Cuando empezaron a preparar

  @Prop({ type: Date })
  readyAt?: Date; // Cuando terminó de prepararse

  @Prop({ type: Number })
  prepTime?: number; // Tiempo de preparación en segundos
}
const KitchenOrderItemSchema = SchemaFactory.createForClass(KitchenOrderItem);

/**
 * KitchenOrder Schema
 * Representa una orden completa en el Kitchen Display System
 */
@Schema({ timestamps: true })
export class KitchenOrder extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ type: String, required: true })
  orderNumber: string; // Para mostrar fácilmente en pantalla

  @Prop({ type: String, required: true })
  orderType: string; // 'dine-in', 'takeout', 'delivery'

  @Prop({ type: String })
  tableNumber?: string; // Mesa (si es dine-in)

  @Prop({ type: String })
  customerName?: string; // Nombre del cliente

  @Prop({ type: [KitchenOrderItemSchema], required: true })
  items: KitchenOrderItem[];

  @Prop({
    type: String,
    required: true,
    enum: ['new', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'new',
    index: true,
  })
  status: string;

  /**
   * new: Recién llegó, sin tocar
   * preparing: Al menos un item está en preparación
   * ready: Todos los items listos, esperando ser servidos
   * completed: Entregado al mesero/cliente (bump)
   * cancelled: Orden cancelada
   */

  @Prop({
    type: String,
    enum: ['normal', 'urgent', 'asap'],
    default: 'normal',
    index: true,
  })
  priority: string; // Para resaltar en pantalla

  @Prop({ type: String })
  notes?: string; // Notas generales de la orden

  @Prop({ type: Date })
  receivedAt: Date; // Cuando llegó a cocina

  @Prop({ type: Date })
  startedAt?: Date; // Cuando empezó la preparación

  @Prop({ type: Date })
  completedAt?: Date; // Cuando se marcó como completada (bump)

  @Prop({ type: Number })
  totalPrepTime?: number; // Tiempo total de preparación en segundos

  @Prop({ type: Number })
  waitTime?: number; // Tiempo de espera antes de empezar (segundos)

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId; // Cocinero asignado (opcional)

  @Prop({ type: String })
  station?: string; // Estación de cocina: "grill", "fryer", "salads", etc.

  @Prop({ type: Boolean, default: false })
  isUrgent: boolean; // Flag para resaltar visualmente

  @Prop({ type: Number, default: 0 })
  estimatedPrepTime: number; // Tiempo estimado en minutos

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const KitchenOrderSchema = SchemaFactory.createForClass(KitchenOrder);

// Índices compuestos
KitchenOrderSchema.index({ tenantId: 1, status: 1, createdAt: 1 });
KitchenOrderSchema.index({ tenantId: 1, station: 1, status: 1 });
KitchenOrderSchema.index({ tenantId: 1, priority: 1 });
KitchenOrderSchema.index({ tenantId: 1, isUrgent: 1 });
KitchenOrderSchema.index({ orderNumber: 1 });

// Índice de texto
KitchenOrderSchema.index({
  orderNumber: 'text',
  tableNumber: 'text',
  customerName: 'text',
});
