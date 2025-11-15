import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EmployeeLeaveBalanceDocument = EmployeeLeaveBalance & Document;

@Schema({ timestamps: true })
export class EmployeeLeaveBalance {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "EmployeeProfile",
    required: true,
    index: true,
    unique: true,
  })
  employeeId: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  accruedDays: number;

  @Prop({ type: Number, default: 0 })
  carriedDays: number;

  @Prop({ type: Number, default: 0 })
  takenDays: number;

  @Prop({ type: Number, default: 0 })
  pendingApprovalDays: number;

  @Prop({ type: Object })
  breakdown?: Record<string, any>;
}

export const EmployeeLeaveBalanceSchema =
  SchemaFactory.createForClass(EmployeeLeaveBalance);

EmployeeLeaveBalanceSchema.index(
  { tenantId: 1, employeeId: 1 },
  { unique: true },
);
