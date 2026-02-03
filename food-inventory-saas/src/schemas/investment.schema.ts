import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type InvestmentDocument = Investment & Document;

export const INVESTMENT_CATEGORIES = [
  "marketing",
  "equipment",
  "technology",
  "expansion",
  "inventory",
  "training",
  "other",
] as const;

@Schema({ timestamps: true })
export class Investment {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: String, required: true, enum: INVESTMENT_CATEGORIES })
  category: string;

  @Prop({ type: Number, required: true })
  investedAmount: number;

  @Prop({ type: Date, required: true })
  investmentDate: Date;

  @Prop({ type: Date })
  expectedReturnDate?: Date;

  @Prop({ type: Number, default: 0 })
  expectedReturn: number;

  @Prop({ type: Number, default: 0 })
  actualReturn: number;

  @Prop({ type: String })
  notes?: string;

  @Prop({
    type: String,
    enum: ["active", "completed", "cancelled"],
    default: "active",
  })
  status: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;
}

export const InvestmentSchema = SchemaFactory.createForClass(Investment);

InvestmentSchema.index({ tenantId: 1, status: 1 });
InvestmentSchema.index({ tenantId: 1, category: 1 });
InvestmentSchema.index({ tenantId: 1, investmentDate: -1 });
