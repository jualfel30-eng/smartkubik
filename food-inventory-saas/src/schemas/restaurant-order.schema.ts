import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RestaurantOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

// Customización aplicada por el cliente a un ítem del pedido
export class OrderItemCustomization {
  @Prop({ type: [{ type: Types.ObjectId, ref: 'RestaurantIngredient' }], default: [] })
  removedIngredients: Types.ObjectId[]; // Ingredientes base que el cliente quitó

  @Prop({
    type: [
      {
        ingredientId: { type: Types.ObjectId, ref: 'RestaurantIngredient' },
        quantity: { type: Number, default: 1 },
        extraPrice: { type: Number, default: 0 },
      },
    ],
    default: [],
    _id: false,
  })
  addedExtras: Array<{
    ingredientId: Types.ObjectId;
    quantity: number;
    extraPrice: number;
  }>;
}

// Ítem individual dentro del pedido
export class RestaurantOrderItem {
  @Prop({ type: Types.ObjectId, ref: 'RestaurantDish', required: true })
  dishId: Types.ObjectId;

  @Prop({ type: String, required: true })
  dishName: string; // Snapshot del nombre al momento del pedido

  @Prop({ type: Number, required: true, min: 0 })
  dishPrice: number; // Snapshot del precio base

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number, required: true, min: 0 })
  subtotal: number; // (dishPrice + extras) * quantity

  @Prop({ type: Object })
  customization?: OrderItemCustomization;

  @Prop({ type: String, trim: true })
  notes?: string; // Nota específica para este ítem
}

@Schema({ timestamps: true })
export class RestaurantOrder {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  // Referencia legible: "RST-20240101-0042"
  @Prop({ type: String, required: true, index: true })
  orderRef: string;

  // Datos del cliente
  @Prop({ type: String, required: true, trim: true })
  customerName: string;

  @Prop({ type: String, required: true, trim: true })
  customerPhone: string;

  // Ítems del pedido (snapshot, no referencias mutables)
  @Prop({ type: Array, required: true })
  items: RestaurantOrderItem[];

  @Prop({ type: Number, required: true, min: 0 })
  subtotal: number;

  @Prop({ type: Number, required: true, min: 0 })
  total: number;

  @Prop({ type: String, trim: true })
  notes?: string; // Nota general del pedido

  @Prop({
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending',
    index: true,
  })
  status: RestaurantOrderStatus;

  @Prop({ type: Date })
  whatsappSentAt?: Date;
}

export type RestaurantOrderDocument = RestaurantOrder & Document;
export const RestaurantOrderSchema = SchemaFactory.createForClass(RestaurantOrder);

RestaurantOrderSchema.index({ tenantId: 1, status: 1 });
RestaurantOrderSchema.index({ tenantId: 1, createdAt: -1 });
RestaurantOrderSchema.index({ tenantId: 1, orderRef: 1 }, { unique: true });
