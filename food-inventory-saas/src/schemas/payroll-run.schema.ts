import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { PayrollCalendar } from "./payroll-calendar.schema";

export type PayrollRunDocument = PayrollRun & Document;

export type PayrollRunStatus =
  | "draft"
  | "calculating"
  | "calculated"
  | "approved"
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

@Schema({ _id: false })
export class PayrollLine {
  @Prop({ type: Types.ObjectId, ref: "EmployeeProfile" })
  employeeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EmployeeContract" })
  contractId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "PayrollStructure" })
  structureId?: Types.ObjectId;

  @Prop({ type: Number })
  structureVersion?: number;

  @Prop({ type: String })
  employeeName?: string;

  @Prop({ type: String })
  department?: string;

  @Prop({ type: Array, default: [] })
  earnings?: Array<{
    conceptCode: string;
    conceptName?: string;
    amount: number;
    debitAccountId?: string;
    creditAccountId?: string;
    manual?: boolean;
  }>;

  @Prop({ type: Array, default: [] })
  deductions?: Array<{
    conceptCode: string;
    conceptName?: string;
    amount: number;
    debitAccountId?: string;
    creditAccountId?: string;
    manual?: boolean;
  }>;

  @Prop({ type: Array, default: [] })
  employerCosts?: Array<{
    conceptCode: string;
    conceptName?: string;
    amount: number;
    debitAccountId?: string;
    creditAccountId?: string;
    manual?: boolean;
  }>;

  @Prop({ type: Number, default: 0 })
  grossPay?: number;

  @Prop({ type: Number, default: 0 })
  deductionsTotal?: number;

  @Prop({ type: Number, default: 0 })
  employerCostsTotal?: number;

  @Prop({ type: Number, default: 0 })
  netPay?: number;

  @Prop({ type: Number, default: 0 })
  hoursWorked?: number;

  @Prop({ type: Number, default: 0 })
  overtimeHours?: number;

  @Prop({ type: Boolean, default: false })
  manual?: boolean;

  @Prop({ type: Array, default: [] })
  evidences?: Array<{
    type?: string;
    reference?: string;
    url?: string;
    notes?: string;
  }>;

  @Prop({ type: Object })
  calculationLog?: Record<string, any>;
}

const PayrollLineSchema = SchemaFactory.createForClass(PayrollLine);

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
    enum: ["draft", "calculating", "calculated", "approved", "posted", "paid"],
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

  @Prop({ type: [PayrollLineSchema], default: [] })
  lines?: PayrollLine[];

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
