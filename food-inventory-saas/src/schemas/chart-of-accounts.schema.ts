import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

export const ACCOUNT_TYPES = [
  "Activo",
  "Pasivo",
  "Patrimonio",
  "Ingreso",
  "Gasto",
];

export const COST_BEHAVIORS = ["fixed", "variable", "mixed"] as const;
export const LIQUIDITY_CLASSES = ["current", "non_current"] as const;

export type ChartOfAccountsDocument = ChartOfAccounts & Document;

@Schema({ timestamps: true })
export class ChartOfAccounts {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, trim: true })
  code: string;

  @Prop({ type: String, required: true, enum: ACCOUNT_TYPES })
  type: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "ChartOfAccounts" })
  parent?: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: Boolean, default: false })
  isSystemAccount?: boolean;

  @Prop({ type: Boolean, default: true })
  isEditable?: boolean;

  @Prop({
    type: String,
    enum: [...COST_BEHAVIORS, null],
    default: null,
  })
  costBehavior?: string;

  @Prop({
    type: String,
    enum: [...LIQUIDITY_CLASSES, null],
    default: null,
  })
  liquidityClass?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const ChartOfAccountsSchema =
  SchemaFactory.createForClass(ChartOfAccounts);

// Ensure code is unique per tenant
ChartOfAccountsSchema.index({ tenantId: 1, code: 1 }, { unique: true });
