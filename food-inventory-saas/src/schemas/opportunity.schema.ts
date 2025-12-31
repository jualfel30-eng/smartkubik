import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type OpportunityDocument = Opportunity & Document;

export enum OpportunityPipeline {
  NEW_BUSINESS = "new_business",
  EXPANSION = "expansion",
}

@Schema()
export class StageHistory {
  @Prop({ type: String, required: true })
  fromStage: string;

  @Prop({ type: String, required: true })
  toStage: string;

  @Prop({ type: Date, required: true, default: Date.now })
  changedAt: Date;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  changedBy: Types.ObjectId;

  @Prop({ type: Number, required: true })
  probability: number;

  @Prop({ type: Number })
  valueWeighted?: number;
}
export const StageHistorySchema = SchemaFactory.createForClass(StageHistory);

@Schema({ timestamps: true })
export class Opportunity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({
    type: String,
    enum: Object.values(OpportunityPipeline),
    required: true,
    default: OpportunityPipeline.NEW_BUSINESS,
  })
  pipeline: OpportunityPipeline;

  @Prop({
    type: String,
    required: true,
    default: "Prospecto",
  })
  stage: string;

  @Prop({ type: Number, required: true, default: 0 })
  probability: number;

  @Prop({ type: Number })
  amount?: number;

  @Prop({ type: String, default: "USD" })
  currency?: string;

  @Prop({ type: String })
  painNeed?: string;

  @Prop({ type: String })
  budgetFit?: string;

  @Prop({ type: String })
  decisionMaker?: string;

  @Prop({ type: String })
  timeline?: string;

  @Prop({ type: [String], default: [] })
  stakeholders?: string[];

  @Prop({ type: [String], default: [] })
  useCases?: string[];

  @Prop({ type: [String], default: [] })
  risks?: string[];

  @Prop({ type: Date })
  expectedCloseDate?: Date;

  @Prop({ type: String })
  reasonLost?: string;

  @Prop({ type: String })
  competitor?: string;

  @Prop({ type: [String], default: [] })
  razonesBloqueo?: string[];

  @Prop({ type: [String], default: [] })
  requisitosLegales?: string[];

  @Prop({ type: String, required: true })
  nextStep: string;

  @Prop({ type: Date, required: true })
  nextStepDue: Date;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  ownerId?: Types.ObjectId;

  @Prop({ type: String })
  source?: string;

  @Prop({ type: Object })
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };

  @Prop({ type: String })
  messageId?: string;

  @Prop({ type: String })
  threadId?: string;

  @Prop({ type: String })
  channel?: string;

  @Prop({ type: String })
  language?: string;

  @Prop({ type: String })
  body?: string;

  @Prop({ type: Number, default: 0 })
  leadScore?: number;

  @Prop({ type: Number, default: 0 })
  intentScore?: number;

  @Prop({ type: Object })
  scoringBreakdown?: {
    fit?: Array<{ rule: string; delta: number }>;
    intent?: Array<{ rule: string; delta: number }>;
  };

  @Prop({
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  })
  mqlStatus?: string;

  @Prop({ type: String })
  mqlReason?: string;

  @Prop({ type: Date })
  mqlAt?: Date;

  @Prop({ type: String })
  sqlStatus?: string;

  @Prop({ type: String })
  sqlReason?: string;

  @Prop({ type: String })
  territory?: string;

  @Prop({ type: [StageHistorySchema], default: [] })
  stageHistory: StageHistory[];

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: "BillingDocument", default: [] })
  quoteIds: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: "BillingDocument", default: [] })
  invoiceIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

export const OpportunitySchema = SchemaFactory.createForClass(Opportunity);

OpportunitySchema.index({ tenantId: 1, customerId: 1 });
OpportunitySchema.index({ tenantId: 1, stage: 1 });
OpportunitySchema.index({ tenantId: 1, ownerId: 1 });
OpportunitySchema.index({ tenantId: 1, pipeline: 1 });
OpportunitySchema.index({ tenantId: 1, nextStepDue: 1 });
