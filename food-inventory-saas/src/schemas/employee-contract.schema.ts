import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EmployeeContractDocument = EmployeeContract & Document;

@Schema({ timestamps: true })
export class EmployeeContract {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EmployeeProfile", required: true })
  employeeId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["permanent", "fixed_term", "internship", "contractor"],
    default: "permanent",
  })
  contractType: string;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({
    type: String,
    enum: ["monthly", "biweekly", "weekly", "custom"],
    default: "monthly",
  })
  payFrequency: string;

  @Prop({ type: Number })
  payDay?: number;

  @Prop({ type: Date })
  nextPayDate?: Date;

  @Prop({
    type: String,
    enum: ["salary", "hourly", "daily"],
    default: "salary",
  })
  compensationType: string;

  @Prop({ type: Number, required: true })
  compensationAmount: number;

  @Prop({ type: String, default: "USD" })
  currency: string;

  @Prop({ type: Types.ObjectId, ref: "PayrollStructure" })
  payrollStructureId?: Types.ObjectId;

  @Prop({
    type: {
      timezone: String,
      days: [String],
      startTime: String,
      endTime: String,
      hoursPerWeek: Number,
    },
  })
  schedule?: {
    timezone?: string;
    days?: string[];
    startTime?: string;
    endTime?: string;
    hoursPerWeek?: number;
  };

  @Prop({
    type: [
      {
        name: String,
        value: String,
        amount: Number,
      },
    ],
    default: [],
  })
  benefits?: Array<{
    name: string;
    value?: string;
    amount?: number;
  }>;

  @Prop({
    type: [
      {
        name: String,
        percentage: Number,
        amount: Number,
      },
    ],
    default: [],
  })
  deductions?: Array<{
    name: string;
    percentage?: number;
    amount?: number;
  }>;

  @Prop({
    type: {
      bankName: String,
      accountType: String,
      accountNumber: String,
      currency: String,
      routingNumber: String,
    },
  })
  bankAccount?: {
    bankName?: string;
    accountType?: string;
    accountNumber?: string;
    currency?: string;
    routingNumber?: string;
  };

  @Prop({
    type: {
      taxId: String,
      withholdingPercentage: Number,
      socialSecurityRate: Number,
    },
  })
  taxation?: {
    taxId?: string;
    withholdingPercentage?: number;
    socialSecurityRate?: number;
  };

  @Prop({
    type: String,
    enum: ["draft", "active", "expired", "terminated"],
    default: "draft",
    index: true,
  })
  status: string;

  @Prop({ type: String })
  notes?: string;

  @Prop({
    type: [
      {
        action: String,
        userId: { type: Types.ObjectId, ref: "User" },
        notes: String,
        at: Date,
      },
    ],
    default: [],
  })
  history?: Array<{
    action: string;
    userId?: Types.ObjectId;
    notes?: string;
    at: Date;
  }>;
}

export const EmployeeContractSchema =
  SchemaFactory.createForClass(EmployeeContract);

EmployeeContractSchema.index({ tenantId: 1, employeeId: 1, status: 1 });
