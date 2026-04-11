import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class RestaurantIngredient {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string; // "Tomate", "Queso extra", "Jalapeños"

  @Prop({ type: String, trim: true })
  category?: string; // Agrupación opcional: "Vegetales", "Lácteos", "Salsas"

  // Precio adicional si se agrega como extra (0 = sin costo)
  @Prop({ type: Number, default: 0, min: 0 })
  extraPrice: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export type RestaurantIngredientDocument = RestaurantIngredient & Document;
export const RestaurantIngredientSchema = SchemaFactory.createForClass(RestaurantIngredient);

RestaurantIngredientSchema.index({ tenantId: 1, isActive: 1 });
