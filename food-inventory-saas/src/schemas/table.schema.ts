import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class Table extends Document {
  @Prop({ required: true, trim: true })
  tableNumber: string;

  @Prop({ required: true, trim: true })
  section: string;

  @Prop({ type: Object })
  position: { x: number; y: number };

  @Prop({
    enum: ["square", "round", "rectangle", "booth"],
    default: "square",
  })
  shape: string;

  @Prop({ required: true, min: 1 })
  minCapacity: number;

  @Prop({ required: true, min: 1 })
  maxCapacity: number;

  @Prop({
    enum: ["available", "occupied", "reserved", "cleaning", "out-of-service"],
    default: "available",
    index: true,
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: "Order" })
  currentOrderId?: Types.ObjectId;

  @Prop()
  seatedAt?: Date;

  @Prop({ min: 0 })
  guestCount?: number;

  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  assignedServerId?: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: "Table" })
  combinesWith?: Types.ObjectId[];

  @Prop({ type: Types.ObjectId })
  combinedWithParent?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const TableSchema = SchemaFactory.createForClass(Table);

// Índices compuestos
TableSchema.index({ tenantId: 1, isDeleted: 1 });
TableSchema.index({ tenantId: 1, section: 1 });
TableSchema.index({ tenantId: 1, status: 1 });
TableSchema.index({ tenantId: 1, tableNumber: 1 });
