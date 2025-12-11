import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type InventoryAlertRuleDocument = InventoryAlertRule & Document;

@Schema({ timestamps: true })
export class InventoryAlertRule {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Warehouse" })
  warehouseId?: Types.ObjectId;

  @Prop({ type: Number, required: true })
  minQuantity: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: [String], default: ["in-app"] })
  channels: string[];

  @Prop({ type: Date })
  lastTriggeredAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const InventoryAlertRuleSchema =
  SchemaFactory.createForClass(InventoryAlertRule);

InventoryAlertRuleSchema.index(
  { tenantId: 1, productId: 1, warehouseId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
InventoryAlertRuleSchema.index({ tenantId: 1, isActive: 1 });
InventoryAlertRuleSchema.index({ tenantId: 1, createdAt: -1 });
