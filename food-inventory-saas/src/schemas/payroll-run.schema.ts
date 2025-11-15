import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { PayrollCalendar } from "./payroll-calendar.schema";

export type PayrollRunDocument = PayrollRun & Document;

export type PayrollRunStatus =
  | "draft"
  | "calculating"
  | "calculated"
  | "posted"
  | "paid";

@Schema({ _id: false })
export class PayrollRunEntry {
  @Prop({ type: Types.ObjectId, ref: "EmployeeProfile" })
  employeeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EmployeeContract" })
  contractId?: Types.ObjectId;

  @Prop({ type: String })
  employeeName?: string;

  @Prop({ type: String })
  department?: string;

  @Prop({ type: String })
  conceptCode: string;

  @Prop({ type: String })
  conceptName?: string;

  @Prop({ type: String })
  conceptType: "earning" | "deduction" | "employer";

  @Prop({ type: Number, default: 0 })
  amount: number;

  @Prop({ type: Object })
  breakdown?: Record<string, any>;
}

const PayrollRunEntrySchema = SchemaFactory.createForClass(PayrollRunEntry);

@Schema({ timestamps: true })
export class PayrollRun {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["monthly", "biweekly", "custom"],
    default: "monthly",
  })
  periodType: "monthly" | "biweekly" | "custom";

  @Prop({ type: Date, required: true })
  periodStart: Date;

  @Prop({ type: Date, required: true })
  periodEnd: Date;

  @Prop({ type: String })
  label?: string;

  @Prop({ type: Types.ObjectId, ref: PayrollCalendar.name })
  calendarId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["draft", "calculating", "calculated", "posted", "paid"],
    default: "draft",
  })
  status: PayrollRunStatus;

  @Prop({ type: Number, default: 0 })
  totalEmployees: number;

  @Prop({ type: Number, default: 0 })
  grossPay: number;

  @Prop({ type: Number, default: 0 })
  deductions: number;

  @Prop({ type: Number, default: 0 })
  employerCosts: number;

  @Prop({ type: Number, default: 0 })
  netPay: number;

  @Prop({ type: [PayrollRunEntrySchema], default: [] })
  entries: PayrollRunEntry[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const PayrollRunSchema = SchemaFactory.createForClass(PayrollRun);

PayrollRunSchema.index({ tenantId: 1, periodStart: -1, periodEnd: -1 });
PayrollRunSchema.index({ tenantId: 1, calendarId: 1 });
