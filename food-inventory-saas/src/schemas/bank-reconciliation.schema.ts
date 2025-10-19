import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type BankReconciliationDocument = BankReconciliation & Document;

@Schema({ timestamps: true })
export class BankReconciliation {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "BankStatement", required: true })
  bankStatementId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "BankAccount", required: true })
  bankAccountId: Types.ObjectId;

  @Prop({ required: true })
  reconciliationDate: Date;

  @Prop({ required: true })
  closingBalance: number;

  @Prop([{ type: Types.ObjectId, ref: "JournalEntry" }])
  clearedTransactions: Types.ObjectId[];

  @Prop([{ type: Types.ObjectId, ref: "JournalEntry" }])
  outstandingTransactions: Types.ObjectId[];

  @Prop({ default: "in_progress" })
  status: "in_progress" | "completed";

  @Prop({ type: Types.ObjectId, ref: "User" })
  startedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  completedBy?: Types.ObjectId;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Object, default: {} })
  summary?: Record<string, any>;
}

export const BankReconciliationSchema =
  SchemaFactory.createForClass(BankReconciliation);

BankReconciliationSchema.index({
  tenantId: 1,
  bankAccountId: 1,
  reconciliationDate: -1,
});
