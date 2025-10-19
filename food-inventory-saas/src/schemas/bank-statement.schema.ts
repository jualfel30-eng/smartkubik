import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type BankStatementTransactionDocument = BankStatementTransaction &
  Document;

@Schema({ _id: false })
export class BankStatementTransaction {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: String, enum: ["credit", "debit"], default: "credit" })
  type: "credit" | "debit";

  @Prop({ type: String })
  reference?: string;

  @Prop({ default: null })
  journalEntryLineId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "BankTransaction", default: null })
  bankTransactionId?: Types.ObjectId | null;

  @Prop({ default: "unmatched" })
  status: "unmatched" | "matched" | "manually_matched";
}

export const BankStatementTransactionSchema = SchemaFactory.createForClass(
  BankStatementTransaction,
);

export type BankStatementDocument = BankStatement & Document;

@Schema({ timestamps: true })
export class BankStatement {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "BankAccount", required: true })
  bankAccountId: Types.ObjectId;

  @Prop({ required: true })
  statementDate: Date;

  @Prop({ required: true })
  startingBalance: number;

  @Prop({ required: true })
  endingBalance: number;

  @Prop([BankStatementTransactionSchema])
  transactions: BankStatementTransaction[];

  @Prop({ default: "draft" })
  status: "draft" | "imported" | "reconciling" | "reconciled";

  @Prop({ type: String, default: "manual" })
  importSource?: string;

  @Prop({ type: String })
  fileName?: string;

  @Prop({ type: String, default: "VES" })
  currency?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;
}

export const BankStatementSchema = SchemaFactory.createForClass(BankStatement);

BankStatementSchema.index({ tenantId: 1, bankAccountId: 1, statementDate: -1 });
