import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Ingrediente base del plato (viene incluido, puede ser removible)
export class DishBaseIngredient {
  @Prop({ type: Types.ObjectId, ref: 'RestaurantIngredient', required: true })
  ingredientId: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  isRemovable: boolean; // El cliente puede pedirlo sin este ingrediente

  @Prop({ type: Boolean, default: true })
  isDefault: boolean; // Viene incluido por defecto
}

// Extra disponible para agregar al plato
export class DishAvailableExtra {
  @Prop({ type: Types.ObjectId, ref: 'RestaurantIngredient', required: true })
  ingredientId: Types.ObjectId;

  @Prop({ type: Number, default: 1, min: 1 })
  maxQuantity: number; // Cuántas veces puede agregarse el mismo extra
}

@Schema({ timestamps: true })
export class RestaurantDish {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'RestaurantCategory', index: true })
  categoryId?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @Prop({ type: String, trim: true })
  imageUrl?: string;

  @Prop({ type: Boolean, default: true, index: true })
  isAvailable: boolean;

  @Prop({ type: Boolean, default: false })
  allowsCustomization: boolean; // Habilita el DishCustomizer

  @Prop({ type: Number, default: 0 })
  displayOrder: number;

  // Ingredientes incluidos en el plato base
  @Prop({
    type: [
      {
        ingredientId: { type: Types.ObjectId, ref: 'RestaurantIngredient' },
        isRemovable: { type: Boolean, default: true },
        isDefault: { type: Boolean, default: true },
      },
    ],
    default: [],
    _id: false,
  })
  baseIngredients: DishBaseIngredient[];

  // Extras disponibles para agregar
  @Prop({
    type: [
      {
        ingredientId: { type: Types.ObjectId, ref: 'RestaurantIngredient' },
        maxQuantity: { type: Number, default: 1 },
      },
    ],
    default: [],
    _id: false,
  })
  availableExtras: DishAvailableExtra[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export type RestaurantDishDocument = RestaurantDish & Document;
export const RestaurantDishSchema = SchemaFactory.createForClass(RestaurantDish);

RestaurantDishSchema.index({ tenantId: 1, isAvailable: 1 });
RestaurantDishSchema.index({ tenantId: 1, categoryId: 1 });
RestaurantDishSchema.index({ tenantId: 1, displayOrder: 1 });
