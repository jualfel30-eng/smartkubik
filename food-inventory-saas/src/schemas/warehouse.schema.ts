import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type WarehouseDocument = Warehouse & Document;

@Schema({ timestamps: true })
export class Warehouse {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({
    type: {
      address: String,
      city: String,
      state: String,
      country: String,
      lat: Number,
      lng: Number,
    },
  })
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isDefault: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);

WarehouseSchema.index(
  { tenantId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
WarehouseSchema.index({ tenantId: 1, isActive: 1 });
