
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ChartOfAccounts } from './chart-of-accounts.schema';

export type JournalEntryDocument = JournalEntry & Document;

@Schema()
class JournalLine {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ChartOfAccounts', required: true })
  account: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  description: string;

  @Prop({ default: 0 })
  debit: number;

  @Prop({ default: 0 })
  credit: number;
}

const JournalLineSchema = SchemaFactory.createForClass(JournalLine);

@Schema({ timestamps: true })
export class JournalEntry {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop([JournalLineSchema])
  lines: JournalLine[];

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, default: false })
  isAutomatic: boolean;
}

export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);
