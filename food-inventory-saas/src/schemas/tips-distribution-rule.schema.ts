import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TipsDistributionRuleDocument = TipsDistributionRule & Document;

@Schema()
export class TipsDistributionRules {
  // Para tipo 'by-hours'
  @Prop({ type: Number, min: 0, max: 1 })
  hourlyWeight?: number; // 0-1

  // Para tipo 'by-sales'
  @Prop({ type: Number, min: 0, max: 1 })
  salesWeight?: number; // 0-1

  // Para tipo 'custom'
  @Prop({ type: String })
  customFormula?: string; // JavaScript expression

  // Roles incluidos
  @Prop({ type: [String], default: [] })
  includedRoles: string[]; // ['waiter', 'bartender', 'busboy']

  // Pool vs individual
  @Prop({ type: Boolean, default: false })
  poolTips: boolean; // true = poolear todas las propinas

  // Para tipo 'fixed-percentage'
  @Prop({ type: Number, min: 0 })
  fixedPercentage?: number; // ej: 5 para 5%

  // Para tipo 'fixed-amount'
  @Prop({ type: Number, min: 0 })
  fixedAmount?: number; // ej: 10 para $10 por venta
}

const TipsDistributionRulesSchema = SchemaFactory.createForClass(
  TipsDistributionRules,
);

@Schema({ timestamps: true })
export class TipsDistributionRule {
  // Virtual _id added by Mongoose but typed here for TS convenience
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string; // 'Distribución equitativa', 'Por horas trabajadas'

  @Prop({
    type: String,
    enum: ["equal", "by-hours", "by-sales", "custom", "fixed-percentage", "fixed-amount"],
    required: true,
  })
  type: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: TipsDistributionRulesSchema, required: true })
  rules: TipsDistributionRules;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;
}

export const TipsDistributionRuleSchema =
  SchemaFactory.createForClass(TipsDistributionRule);

// Índices
TipsDistributionRuleSchema.index({ tenantId: 1, isActive: 1 });
