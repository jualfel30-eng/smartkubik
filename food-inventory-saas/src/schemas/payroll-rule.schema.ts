import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { PayrollConceptType } from "./payroll-concept.schema";

export type PayrollRuleDocument = PayrollRule & Document;

export type PayrollRuleCalculationType = "fixed" | "percentage" | "formula";

@Schema({ timestamps: true })
export class PayrollRule {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "PayrollStructure",
    required: true,
    index: true,
  })
  structureId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "PayrollConcept", required: true })
  conceptId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["earning", "deduction", "employer"],
    required: true,
  })
  conceptType: PayrollConceptType;

  @Prop({ type: Number, default: 0 })
  priority: number;

  @Prop({
    type: String,
    enum: ["fixed", "percentage", "formula"],
    default: "fixed",
  })
  calculationType: PayrollRuleCalculationType;

  @Prop({ type: Number })
  amount?: number;

  @Prop({ type: Number })
  percentage?: number;

  @Prop({ type: String })
  formula?: string;

  @Prop({ type: [String], default: [] })
  baseConceptCodes: string[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const PayrollRuleSchema = SchemaFactory.createForClass(PayrollRule);

PayrollRuleSchema.index(
  { tenantId: 1, structureId: 1, priority: 1 },
  { unique: false },
);
