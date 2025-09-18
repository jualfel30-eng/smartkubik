import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

export const ACCOUNT_TYPES = [
  "Activo",
  "Pasivo",
  "Patrimonio",
  "Ingreso",
  "Gasto",
];

export type ChartOfAccountsDocument = ChartOfAccounts & Document;

@Schema({ timestamps: true })
export class ChartOfAccounts {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  code: string; // e.g., 1101 for Cash

  @Prop({ required: true, enum: ACCOUNT_TYPES })
  type: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "ChartOfAccounts" })
  parent?: MongooseSchema.Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

export const ChartOfAccountsSchema =
  SchemaFactory.createForClass(ChartOfAccounts);

// Ensure code is unique per tenant
ChartOfAccountsSchema.index({ tenantId: 1, code: 1 }, { unique: true });
