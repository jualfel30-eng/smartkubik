import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type KnowledgeBaseDocumentDocument = KnowledgeBaseDocument & Document;

@Schema({ timestamps: true })
export class KnowledgeBaseDocument {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true })
  source: string; // Original filename or provided source

  @Prop({ required: true })
  fileName: string; // The name of the file as it was uploaded

  @Prop()
  fileType: string; // e.g., application/pdf

  @Prop()
  fileSize: number; // in bytes
}

export const KnowledgeBaseDocumentSchema = SchemaFactory.createForClass(
  KnowledgeBaseDocument,
);

// Compound index to ensure a document source is unique per tenant
KnowledgeBaseDocumentSchema.index({ tenantId: 1, source: 1 }, { unique: true });
