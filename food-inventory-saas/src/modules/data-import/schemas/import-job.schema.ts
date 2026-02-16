import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ImportJobDocument = ImportJob & Document;

export const IMPORT_ENTITY_TYPES = [
  "products",
  "customers",
  "suppliers",
  "inventory",
  "categories",
] as const;

export type ImportEntityType = (typeof IMPORT_ENTITY_TYPES)[number];

export const IMPORT_JOB_STATUSES = [
  "uploaded",
  "parsed",
  "mapping",
  "validating",
  "validated",
  "processing",
  "completed",
  "failed",
  "cancelled",
  "rolled_back",
] as const;

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

@Schema()
export class ImportJobError {
  @Prop({ type: Number, required: true })
  rowIndex: number;

  @Prop({ type: String })
  field?: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Object })
  rawValue?: any;
}

@Schema()
export class UpdateSnapshot {
  @Prop({ type: String, required: true })
  recordId: string;

  @Prop({ type: Object, required: true })
  previousValues: Record<string, any>;
}

@Schema({ timestamps: true })
export class ImportJob {
  @Prop({
    type: String,
    required: true,
    enum: IMPORT_ENTITY_TYPES,
  })
  entityType: ImportEntityType;

  @Prop({
    type: String,
    required: true,
    enum: IMPORT_JOB_STATUSES,
    default: "uploaded",
  })
  status: ImportJobStatus;

  @Prop({ type: String, required: true })
  originalFileName: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  fileSize: number;

  /** Parsed column headers from the uploaded file */
  @Prop({ type: [String], default: [] })
  parsedHeaders: string[];

  /** Total number of data rows (excluding header) */
  @Prop({ type: Number, default: 0 })
  totalRows: number;

  /** Parsed data stored in-memory on the document (cleared after execution) */
  @Prop({ type: [Object] })
  parsedData?: Record<string, any>[];

  /** Column mapping: { sourceColumnHeader: targetFieldKey } */
  @Prop({ type: Object })
  columnMapping?: Record<string, string>;

  /** Pre-built mapping preset used (null if custom) */
  @Prop({ type: String })
  mappingPreset?: string;

  /** Import options */
  @Prop({
    type: Object,
    default: { updateExisting: false, skipErrors: true, batchSize: 100 },
  })
  options: {
    updateExisting: boolean;
    skipErrors: boolean;
    batchSize: number;
  };

  // ── Progress tracking ──

  @Prop({ type: Number, default: 0 })
  processedRows: number;

  @Prop({ type: Number, default: 0 })
  successfulRows: number;

  @Prop({ type: Number, default: 0 })
  updatedRows: number;

  @Prop({ type: Number, default: 0 })
  failedRows: number;

  @Prop({ type: Number, default: 0 })
  skippedRows: number;

  @Prop({ type: Number, default: 0 })
  warningRows: number;

  // ── Error details ──

  @Prop({ type: [Object], default: [] })
  errors: ImportJobError[];

  // ── Update snapshots for rollback ──

  @Prop({ type: [Object], default: [] })
  updateSnapshots: UpdateSnapshot[];

  // ── Timing ──

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  // ── Rollback tracking ──

  @Prop({ type: Boolean, default: false })
  isRolledBack: boolean;

  @Prop({ type: Date })
  rolledBackAt?: Date;

  @Prop({ type: Number })
  rolledBackDeletedCount?: number;

  @Prop({ type: Number })
  rolledBackRestoredCount?: number;

  // ── BullMQ job reference ──

  @Prop({ type: String })
  bullJobId?: string;

  // ── Ownership ──

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

export const ImportJobSchema = SchemaFactory.createForClass(ImportJob);

ImportJobSchema.index({ tenantId: 1, createdAt: -1 });
ImportJobSchema.index({ tenantId: 1, status: 1 });
ImportJobSchema.index({ tenantId: 1, entityType: 1, createdAt: -1 });
