import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type OpportunityStageDefinitionDocument = OpportunityStageDefinition &
  Document;

@Schema({ timestamps: true })
export class OpportunityStageDefinition {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  probability?: number;

  @Prop({ type: Number, default: 0 })
  order?: number;

  @Prop({ type: [String], default: [] })
  requiredFields?: string[];

  @Prop({ type: Boolean, default: false })
  isDefault?: boolean;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;
}

export const OpportunityStageDefinitionSchema = SchemaFactory.createForClass(
  OpportunityStageDefinition,
);

OpportunityStageDefinitionSchema.index(
  { tenantId: 1, name: 1 },
  { unique: true },
);
