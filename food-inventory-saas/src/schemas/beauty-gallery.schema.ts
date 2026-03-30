import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Schema para galería de trabajos/portfolio del salón de belleza
 */
@Schema({ timestamps: true })
export class BeautyGalleryItem {
  // Multi-tenancy
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  // Imagen (Base64 string)
  @Prop({ type: String, required: true })
  image: string; // "data:image/jpeg;base64,..."

  @Prop({ type: String, trim: true })
  caption?: string; // Descripción de la foto

  // Filtros para categorización
  @Prop({ type: Types.ObjectId, ref: 'Professional' })
  professional?: Types.ObjectId; // Profesional que realizó el trabajo

  @Prop({ type: String, trim: true, index: true })
  category?: string; // "Cortes", "Color", "Barba", "Uñas"

  @Prop({ type: [String], default: [] })
  tags: string[]; // ["fade", "moderno", "rubio", etc.]

  // Estado
  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  sortOrder: number; // Para ordenar manualmente en el storefront

  // Auditoría
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export type BeautyGalleryItemDocument = BeautyGalleryItem & Document;
export const BeautyGalleryItemSchema = SchemaFactory.createForClass(BeautyGalleryItem);

// Índices
BeautyGalleryItemSchema.index({ tenantId: 1, isActive: 1, sortOrder: 1 });
BeautyGalleryItemSchema.index({ tenantId: 1, category: 1 });
BeautyGalleryItemSchema.index({ tenantId: 1, professional: 1 });
BeautyGalleryItemSchema.index({ tenantId: 1, createdAt: -1 });
