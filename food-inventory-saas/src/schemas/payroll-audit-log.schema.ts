import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PayrollAuditLogDocument = PayrollAuditLog & Document;

@Schema({ timestamps: true })
export class PayrollAuditLog {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  userId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  entity: string;

  @Prop({ type: Types.ObjectId })
  entityId?: Types.ObjectId;

  @Prop({ type: String })
  action: string;

  @Prop({ type: Object })
  before?: Record<string, any>;

  @Prop({ type: Object })
  after?: Record<string, any>;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const PayrollAuditLogSchema =
  SchemaFactory.createForClass(PayrollAuditLog);

PayrollAuditLogSchema.index({
  tenantId: 1,
  entity: 1,
  entityId: 1,
  createdAt: -1,
});
