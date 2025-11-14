import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type BillOfMaterialsDocument = BillOfMaterials & Document;

/**
 * Componente individual de una BOM (ingrediente/material)
 */
@Schema()
export class BillOfMaterialsComponent {
  readonly _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  componentProductId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Product" })
  componentVariantId?: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  quantity: number;

  @Prop({ type: String, required: true })
  unit: string; // Usa sistema UoM

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  scrapPercentage: number; // % de desperdicio esperado

  @Prop({ type: Boolean, default: false })
  isOptional: boolean;

  @Prop({ type: String })
  notes?: string;
}

export const BillOfMaterialsComponentSchema = SchemaFactory.createForClass(
  BillOfMaterialsComponent,
);

/**
 * Subproducto generado durante la producción
 */
@Schema()
export class BillOfMaterialsByproduct {
  readonly _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  byproductProductId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  quantity: number;

  @Prop({ type: String, required: true })
  unit: string;

  @Prop({ type: String })
  notes?: string;
}

export const BillOfMaterialsByproductSchema = SchemaFactory.createForClass(
  BillOfMaterialsByproduct,
);

/**
 * Bill of Materials (BOM) - Receta de producción
 * Define qué componentes se necesitan para producir un producto
 */
@Schema({ timestamps: true })
export class BillOfMaterials {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId; // Producto final

  @Prop({ type: Types.ObjectId, ref: "Product" })
  productVariantId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  code: string; // BOM-001, BOM-002, etc.

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true, default: 1, min: 0.001 })
  productionQuantity: number; // Cantidad que produce esta receta

  @Prop({ type: String, required: true })
  productionUnit: string;

  @Prop({ type: [BillOfMaterialsComponentSchema], default: [] })
  components: BillOfMaterialsComponent[];

  @Prop({ type: [BillOfMaterialsByproductSchema], default: [] })
  byproducts: BillOfMaterialsByproduct[]; // Subproductos opcionales

  @Prop({
    type: String,
    enum: ["production", "kit", "subcontract"],
    default: "production",
  })
  bomType: string;

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

export const BillOfMaterialsSchema =
  SchemaFactory.createForClass(BillOfMaterials);

// Índices
BillOfMaterialsSchema.index({ code: 1, tenantId: 1 }, { unique: true });
BillOfMaterialsSchema.index({ productId: 1, tenantId: 1 });
BillOfMaterialsSchema.index({ tenantId: 1, isActive: 1 });
