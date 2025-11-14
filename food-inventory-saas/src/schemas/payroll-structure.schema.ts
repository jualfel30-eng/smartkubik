import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PayrollStructureDocument = PayrollStructure & Document;

export type PayrollStructurePeriodType =
  | "monthly"
  | "biweekly"
  | "weekly"
  | "custom";

@Schema({ timestamps: true })
export class PayrollStructure {
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
  periodType: PayrollStructurePeriodType;

  @Prop({ type: [String], default: [] })
  appliesToRoles: string[];

  @Prop({ type: [String], default: [] })
  appliesToDepartments: string[];

  @Prop({ type: [String], default: [] })
  appliesToContractTypes: string[];

  @Prop({ type: Date, default: Date.now })
  effectiveFrom: Date;

  @Prop({ type: Date })
  effectiveTo?: Date;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: "PayrollStructure" })
  supersedesId?: Types.ObjectId;

  @Prop({ type: Date })
  activatedAt?: Date;

  @Prop({ type: Date })
  deactivatedAt?: Date;

  @Prop({ type: Number, default: 1 })
  version: number;

  @Prop({ type: String, default: "*", index: true })
  roleKey: string;

  @Prop({ type: String, default: "*", index: true })
  departmentKey: string;

  @Prop({ type: String, default: "*", index: true })
  contractTypeKey: string;

  @Prop({ type: String, default: "*#*#*", index: true })
  scopeKey: string;
}

export const PayrollStructureSchema =
  SchemaFactory.createForClass(PayrollStructure);

PayrollStructureSchema.index({ tenantId: 1, name: 1 }, { unique: true });
PayrollStructureSchema.index({ tenantId: 1, version: 1 });
PayrollStructureSchema.index(
  { tenantId: 1, scopeKey: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);
PayrollStructureSchema.index({
  tenantId: 1,
  roleKey: 1,
  departmentKey: 1,
  effectiveFrom: 1,
});
PayrollStructureSchema.index({
  tenantId: 1,
  contractTypeKey: 1,
  effectiveFrom: 1,
});
