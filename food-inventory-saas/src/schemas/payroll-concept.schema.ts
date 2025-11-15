import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PayrollConceptDocument = PayrollConcept & Document;

export type PayrollConceptCalculationMethod =
  | "fixed_amount"
  | "percentage_of_base"
  | "custom_formula";

export type PayrollConceptType = "earning" | "deduction" | "employer";

@Schema({ timestamps: true })
export class PayrollConcept {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({
    type: String,
    enum: ["earning", "deduction", "employer"],
    required: true,
    default: "earning",
  })
  conceptType: PayrollConceptType;

  @Prop({
    type: {
      method: {
        type: String,
        enum: ["fixed_amount", "percentage_of_base", "custom_formula"],
        default: "fixed_amount",
      },
      value: Number,
      formula: String,
      appliesTo: {
        type: [String],
        default: [],
      },
    },
  })
  calculation: {
    method: PayrollConceptCalculationMethod;
    value?: number;
    formula?: string;
    appliesTo?: string[];
  };

  @Prop({ type: Types.ObjectId, ref: "ChartOfAccounts" })
  debitAccountId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "ChartOfAccounts" })
  creditAccountId?: Types.ObjectId;

  @Prop({ type: String })
  costCenter?: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const PayrollConceptSchema =
  SchemaFactory.createForClass(PayrollConcept);

PayrollConceptSchema.index(
  { tenantId: 1, code: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);
