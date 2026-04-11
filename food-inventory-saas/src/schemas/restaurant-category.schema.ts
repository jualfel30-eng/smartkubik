import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class RestaurantCategory {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string; // "Entradas", "Platos principales", "Postres", "Bebidas"

  @Prop({ type: String, required: true, trim: true, lowercase: true })
  slug: string; // "entradas", "platos-principales"

  @Prop({ type: Number, default: 0 })
  displayOrder: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export type RestaurantCategoryDocument = RestaurantCategory & Document;
export const RestaurantCategorySchema = SchemaFactory.createForClass(RestaurantCategory);

RestaurantCategorySchema.index({ tenantId: 1, slug: 1 }, { unique: true });
RestaurantCategorySchema.index({ tenantId: 1, displayOrder: 1 });
