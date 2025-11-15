import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { PayrollStructure } from "./payroll-structure.schema";

export type PayrollCalendarDocument = PayrollCalendar & Document;

export type PayrollCalendarFrequency =
  | "monthly"
  | "biweekly"
  | "weekly"
  | "custom";

export type PayrollCalendarStatus = "draft" | "open" | "closed" | "posted";

@Schema({ timestamps: true })
export class PayrollCalendar {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({
    type: String,
    enum: ["monthly", "biweekly", "weekly", "custom"],
    default: "monthly",
  })
  frequency: PayrollCalendarFrequency;

  @Prop({ type: Date, required: true })
  periodStart: Date;

  @Prop({ type: Date, required: true })
  periodEnd: Date;

  @Prop({ type: Date, required: true })
  cutoffDate: Date;

  @Prop({ type: Date, required: true })
  payDate: Date;

  @Prop({ type: Types.ObjectId, ref: PayrollStructure.name })
  structureId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["draft", "open", "closed", "posted"],
    default: "draft",
  })
  status: PayrollCalendarStatus;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const PayrollCalendarSchema =
  SchemaFactory.createForClass(PayrollCalendar);

PayrollCalendarSchema.index({ tenantId: 1, payDate: 1 });
PayrollCalendarSchema.index({ tenantId: 1, status: 1 });
