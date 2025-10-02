import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PurchaseOrderRatingDocument = PurchaseOrderRating & Document;

@Schema({ timestamps: true })
export class PurchaseOrderRating {
  @Prop({ type: Types.ObjectId, ref: "PurchaseOrder", required: true })
  purchaseOrderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  supplierId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String })
  reason?: string;

  @Prop({ type: String })
  comments?: string;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;
}

export const PurchaseOrderRatingSchema = SchemaFactory.createForClass(PurchaseOrderRating);

PurchaseOrderRatingSchema.index({ purchaseOrderId: 1 }, { unique: true });
PurchaseOrderRatingSchema.index({ supplierId: 1, tenantId: 1 });
PurchaseOrderRatingSchema.index({ rating: 1, tenantId: 1 });