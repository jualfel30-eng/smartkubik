import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type MergeJobDocument = MergeJob & Document;

export const MERGE_JOB_STATUSES = [
  "pending_review",
  "approved",
  "executing",
  "completed",
  "failed",
  "reversed",
] as const;

export type MergeJobStatus = (typeof MERGE_JOB_STATUSES)[number];

@Schema()
export class FieldFromDuplicate {
  @Prop({ type: String, required: true })
  field: string;

  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  sourceProductId: Types.ObjectId;

  @Prop({ type: Object })
  value: any;
}

@Schema()
export class ConflictResolved {
  @Prop({ type: String, required: true })
  field: string;

  @Prop({ type: [Object], default: [] })
  options: { productId: Types.ObjectId; value: any }[];

  @Prop({ type: Types.ObjectId, ref: "Product" })
  chosenProductId: Types.ObjectId;

  @Prop({ type: Object })
  chosenValue: any;
}

@Schema()
export class MergeDetails {
  @Prop({ type: [String], default: [] })
  fieldsFromMaster: string[];

  @Prop({ type: [Object], default: [] })
  fieldsFromDuplicates: FieldFromDuplicate[];

  @Prop({ type: [Object], default: [] })
  conflictsResolved: ConflictResolved[];
}

@Schema()
export class Reassignments {
  @Prop({ type: Number, default: 0 })
  inventoryRecords: number;

  @Prop({ type: Number, default: 0 })
  inventoryMovements: number;

  @Prop({ type: Number, default: 0 })
  orderItems: number;

  @Prop({ type: Number, default: 0 })
  purchaseOrderItems: number;

  @Prop({ type: Number, default: 0 })
  transferOrderItems: number;

  @Prop({ type: Number, default: 0 })
  priceListEntries: number;

  @Prop({ type: Number, default: 0 })
  billOfMaterials: number;

  @Prop({ type: Number, default: 0 })
  campaigns: number;

  @Prop({ type: Number, default: 0 })
  otherReferences: number;
}

@Schema({ timestamps: true })
export class MergeJob {
  @Prop({ type: String, required: true })
  jobNumber: string;

  @Prop({
    type: String,
    required: true,
    enum: MERGE_JOB_STATUSES,
    default: "pending_review",
  })
  status: MergeJobStatus;

  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  masterProductId: Types.ObjectId;

  @Prop({ type: String })
  masterProductSku: string;

  @Prop({ type: String })
  masterProductName: string;

  @Prop({
    type: [{ type: Types.ObjectId, ref: "Product" }],
    required: true,
  })
  duplicateProductIds: Types.ObjectId[];

  @Prop({ type: Object })
  mergeDetails: MergeDetails;

  @Prop({ type: Object })
  reassignments: Reassignments;

  @Prop({ type: [Object], default: [] })
  duplicateSnapshots: Record<string, any>[];

  // Metadata
  @Prop({ type: Types.ObjectId, ref: "User" })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  executedBy?: Types.ObjectId;

  @Prop({ type: Date })
  executedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  reversedBy?: Types.ObjectId;

  @Prop({ type: Date })
  reversedAt?: Date;

  @Prop({ type: String })
  reversalReason?: string;

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ type: String })
  notes?: string;

  // Reversibility
  @Prop({ type: Boolean, default: true })
  canReverse: boolean;

  @Prop({ type: Date })
  reverseDeadline?: Date;

  // Standard fields
  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const MergeJobSchema = SchemaFactory.createForClass(MergeJob);

MergeJobSchema.index({ tenantId: 1, jobNumber: 1 }, { unique: true });
MergeJobSchema.index({ tenantId: 1, status: 1 });
MergeJobSchema.index({ tenantId: 1, masterProductId: 1 });
MergeJobSchema.index({ tenantId: 1, createdAt: -1 });
MergeJobSchema.index({ duplicateProductIds: 1, tenantId: 1 });
