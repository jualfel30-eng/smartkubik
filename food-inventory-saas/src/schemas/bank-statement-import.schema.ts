import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BankStatementImportDocument = BankStatementImport & Document;

@Schema({ timestamps: true })
export class BankStatementImport {
  @Prop({ type: Types.ObjectId, ref: 'BankAccount', required: true, index: true })
  bankAccountId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  totalRows: number;

  @Prop({ type: Number, default: 0 })
  matchedRows: number;

  @Prop({ type: Number, default: 0 })
  unmatchedRows: number;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const BankStatementImportSchema = SchemaFactory.createForClass(BankStatementImport);

BankStatementImportSchema.index({ tenantId: 1, bankAccountId: 1, createdAt: -1 });
