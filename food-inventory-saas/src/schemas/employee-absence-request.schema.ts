import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EmployeeAbsenceRequestDocument = EmployeeAbsenceRequest & Document;

export type EmployeeAbsenceStatus = "pending" | "approved" | "rejected";

@Schema({ timestamps: true })
export class EmployeeAbsenceRequest {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "EmployeeProfile",
    required: true,
    index: true,
  })
  employeeId: Types.ObjectId;

  @Prop({ type: String, trim: true })
  employeeName?: string;

  @Prop({
    type: String,
    enum: ["vacation", "sick", "unpaid", "other"],
    default: "vacation",
  })
  leaveType: string;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: Number, default: 0 })
  totalDays: number;

  @Prop({
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    index: true,
  })
  status: EmployeeAbsenceStatus;

  @Prop({ type: String })
  reason?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: String })
  rejectionReason?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const EmployeeAbsenceRequestSchema =
  SchemaFactory.createForClass(EmployeeAbsenceRequest);

EmployeeAbsenceRequestSchema.index(
  { tenantId: 1, employeeId: 1, startDate: 1 },
  { background: true },
);
EmployeeAbsenceRequestSchema.index(
  { tenantId: 1, status: 1, startDate: 1, endDate: 1 },
  { background: true },
);
