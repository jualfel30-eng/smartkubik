import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { PayrollRunStatus } from "./payroll-run.schema";

export type SpecialPayrollRunDocument = SpecialPayrollRun & Document;

export type SpecialPayrollRunType =
  | "bonus"
  | "severance"
  | "thirteenth"
  | "vacation_bonus";

@Schema({ _id: false })
export class SpecialPayrollEmployee {
  @Prop({ type: Types.ObjectId, ref: "EmployeeProfile" })
  employeeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EmployeeContract" })
  contractId?: Types.ObjectId;

  @Prop({ type: String })
  employeeName?: string;

  @Prop({ type: Number, default: 0 })
  amount?: number;

  @Prop({ type: Object })
  breakdown?: Record<string, any>;
}

const SpecialPayrollEmployeeSchema = SchemaFactory.createForClass(
  SpecialPayrollEmployee,
);

@Schema({ timestamps: true })
export class SpecialPayrollRun {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["bonus", "severance", "thirteenth", "vacation_bonus"],
    required: true,
  })
  type: SpecialPayrollRunType;

  @Prop({ type: String })
  label?: string;

  @Prop({ type: Date, required: true })
  periodStart: Date;

  @Prop({ type: Date, required: true })
  periodEnd: Date;

  @Prop({
    type: String,
    enum: ["draft", "calculating", "calculated", "approved", "posted", "paid"],
    default: "draft",
  })
  status: PayrollRunStatus;

  @Prop({ type: Types.ObjectId, ref: "PayrollStructure" })
  structureId?: Types.ObjectId;

  @Prop({ type: Number })
  structureVersion?: number;

  @Prop({ type: [SpecialPayrollEmployeeSchema], default: [] })
  employees?: SpecialPayrollEmployee[];

  @Prop({ type: Number, default: 0 })
  totalEmployees?: number;

  @Prop({ type: Number, default: 0 })
  grossPay?: number;

  @Prop({ type: Number, default: 0 })
  deductions?: number;

  @Prop({ type: Number, default: 0 })
  employerCosts?: number;

  @Prop({ type: Number, default: 0 })
  netPay?: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const SpecialPayrollRunSchema =
  SchemaFactory.createForClass(SpecialPayrollRun);

SpecialPayrollRunSchema.index({ tenantId: 1, periodStart: -1, type: 1 });
