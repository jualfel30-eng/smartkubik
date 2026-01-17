import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type WarehouseDocument = Warehouse & Document;
export type BinLocationDocument = BinLocation & Document;

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

/**
 * BinLocation - Represents a specific storage location within a warehouse
 * Hierarchy: Warehouse > Zone > Aisle > Shelf > Bin
 */
@Schema({ timestamps: true })
export class BinLocation {
  @Prop({ type: Types.ObjectId, ref: "Warehouse", required: true })
  warehouseId: Types.ObjectId;

  @Prop({ type: String, required: true })
  code: string; // Unique code within warehouse, e.g., "A-01-02-03"

  @Prop({ type: String })
  zone?: string; // e.g., "A", "B", "Refrigerado", "Seco"

  @Prop({ type: String })
  aisle?: string; // e.g., "01", "02"

  @Prop({ type: String })
  shelf?: string; // e.g., "01", "02", "03"

  @Prop({ type: String })
  bin?: string; // e.g., "01", "02"

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, enum: ["picking", "bulk", "receiving", "shipping", "quarantine"], default: "picking" })
  locationType: string;

  @Prop({ type: Number })
  maxCapacity?: number; // Optional max capacity in units

  @Prop({ type: Number, default: 0 })
  currentOccupancy: number;

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

export const BinLocationSchema = SchemaFactory.createForClass(BinLocation);

// Unique code within warehouse for a tenant
BinLocationSchema.index(
  { tenantId: 1, warehouseId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
BinLocationSchema.index({ tenantId: 1, warehouseId: 1, isActive: 1 });
BinLocationSchema.index({ tenantId: 1, zone: 1 });
BinLocationSchema.index({ tenantId: 1, locationType: 1 });
