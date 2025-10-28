import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

export type JournalEntryDocument = JournalEntry & Document;

@Schema()
class JournalLine {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "ChartOfAccounts",
    required: true,
  })
  account: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: Number, default: 0 })
  debit: number;

  @Prop({ type: Number, default: 0 })
  credit: number;
}

const JournalLineSchema = SchemaFactory.createForClass(JournalLine);

@Schema({ timestamps: true })
export class JournalEntry {
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String, required: true, trim: true })
  description: string;

  @Prop({ type: [JournalLineSchema] })
  lines: JournalLine[];

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: Boolean, required: true, default: false })
  isAutomatic: boolean;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);

// Índices para optimizar consultas contables
JournalEntrySchema.index({ date: -1, tenantId: 1 });
JournalEntrySchema.index({ tenantId: 1, createdAt: -1 });
JournalEntrySchema.index({ isAutomatic: 1, tenantId: 1 });
JournalEntrySchema.index({ "lines.account": 1, tenantId: 1 });
