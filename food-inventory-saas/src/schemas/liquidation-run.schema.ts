import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type LiquidationRunDocument = LiquidationRun & Document;

export type LiquidationRunStatus = "draft" | "calculated" | "approved" | "paid";

@Schema({ _id: false })
export class LiquidationEntry {
  @Prop({ type: Types.ObjectId, ref: "EmployeeProfile" })
  employeeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EmployeeContract" })
  contractId?: Types.ObjectId;

  @Prop({ type: String })
  employeeName?: string;

  @Prop({ type: Number, default: 0 })
  yearsOfService?: number;

  @Prop({ type: Number, default: 0 })
  baseSalary?: number;

  @Prop({ type: Number, default: 0 })
  integralSalary?: number;

  @Prop({ type: Number, default: 0 })
  severanceDays?: number;

  @Prop({ type: Number, default: 0 })
  severanceAmount?: number;

  @Prop({ type: Number, default: 0 })
  vacationDays?: number;

  @Prop({ type: Number, default: 0 })
  vacationAmount?: number;

  @Prop({ type: Number, default: 0 })
  utilitiesDays?: number;

  @Prop({ type: Number, default: 0 })
  utilitiesAmount?: number;

  @Prop({ type: Number, default: 0 })
  deductions?: number;

  @Prop({ type: Number, default: 0 })
  netAmount?: number;

  @Prop({ type: Object })
  breakdown?: Record<string, any>;
}

const LiquidationEntrySchema = SchemaFactory.createForClass(LiquidationEntry);

@Schema({ timestamps: true })
export class LiquidationRun {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, default: "VE" })
  country: string;

  @Prop({ type: Types.ObjectId, ref: "LiquidationRuleSet" })
  ruleSetId?: Types.ObjectId;

  @Prop({ type: String })
  label?: string;

  @Prop({ type: Date })
  terminationDate?: Date;

  @Prop({
    type: String,
    enum: ["draft", "calculated", "approved", "paid"],
    default: "draft",
  })
  status: LiquidationRunStatus;

  @Prop({ type: [LiquidationEntrySchema], default: [] })
  entries: LiquidationEntry[];

  @Prop({ type: Number, default: 0 })
  totalAmount: number;

  @Prop({ type: Number, default: 0 })
  totalDeductions: number;

  @Prop({ type: Number, default: 0 })
  netPayable: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const LiquidationRunSchema =
  SchemaFactory.createForClass(LiquidationRun);

LiquidationRunSchema.index({ tenantId: 1, country: 1, createdAt: -1 });
