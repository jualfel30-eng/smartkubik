import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type BusinessLocationDocument = BusinessLocation & Document;

export enum BusinessLocationType {
  WAREHOUSE = "warehouse",
  POINT_OF_SALE = "point_of_sale",
  MIXED = "mixed",
}

@Schema({ timestamps: true })
export class BusinessLocation {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({
    type: String,
    enum: Object.values(BusinessLocationType),
    required: true,
  })
  type: BusinessLocationType;

  @Prop({
    type: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
  })
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    coordinates?: {
      lat?: number;
      lng?: number;
    };
  };

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  manager?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: "Warehouse" }], default: [] })
  warehouseIds: Types.ObjectId[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const BusinessLocationSchema =
  SchemaFactory.createForClass(BusinessLocation);

BusinessLocationSchema.index(
  { tenantId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
BusinessLocationSchema.index({ tenantId: 1, isActive: 1 });
BusinessLocationSchema.index({ tenantId: 1, type: 1 });
