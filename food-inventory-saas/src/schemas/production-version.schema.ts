import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ProductionVersionDocument = ProductionVersion & Document;

/**
 * Production Version - Versión de Producción
 * Combina un BOM con un Routing para definir cómo se produce un producto
 * Permite tener múltiples formas de producir el mismo producto
 */
@Schema({ timestamps: true })
export class ProductionVersion {
  @Prop({ type: String, required: true })
  code: string; // PV-001, PV-HAM-V1

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Product" })
  productVariantId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "BillOfMaterials", required: true })
  bomId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Routing" })
  routingId?: Types.ObjectId; // Opcional (algunos productos no necesitan routing)

  @Prop({ type: Boolean, default: false })
  isDefault: boolean; // Versión por defecto

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date })
  validFrom?: Date;

  @Prop({ type: Date })
  validTo?: Date;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const ProductionVersionSchema =
  SchemaFactory.createForClass(ProductionVersion);

// Índices
ProductionVersionSchema.index({ code: 1, tenantId: 1 }, { unique: true });
ProductionVersionSchema.index({ productId: 1, tenantId: 1 });
ProductionVersionSchema.index({ tenantId: 1, isActive: 1, isDefault: 1 });
