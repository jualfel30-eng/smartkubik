import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export enum ExecutionStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  EXITED = "exited",
  FAILED = "failed",
  PAUSED = "paused",
}

@Schema()
export class StepExecution {
  @Prop({ required: true })
  stepId: string;

  @Prop({ required: true })
  stepName: string;

  @Prop({ required: true })
  executedAt: Date;

  @Prop({ type: Boolean, default: true })
  success: boolean;

  @Prop()
  error?: string;

  @Prop({ type: Object })
  result?: Record<string, any>;

  @Prop()
  nextStepId?: string;
}

const StepExecutionSchema = SchemaFactory.createForClass(StepExecution);

@Schema({ timestamps: true })
export class WorkflowExecution {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "MarketingWorkflow",
    required: true,
    index: true,
  })
  workflowId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ExecutionStatus,
    default: ExecutionStatus.ACTIVE,
  })
  status: ExecutionStatus;

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  exitedAt?: Date;

  @Prop()
  pausedAt?: Date;

  // Current state
  @Prop()
  currentStepId?: string;

  @Prop()
  nextExecutionAt?: Date; // For wait steps

  // Execution history
  @Prop({ type: [StepExecutionSchema], default: [] })
  stepExecutions: StepExecution[];

  // Context data (customer data snapshot at workflow start)
  @Prop({ type: Object })
  contextData?: Record<string, any>;

  // Exit reason
  @Prop()
  exitReason?: string;

  // Error tracking
  @Prop()
  lastError?: string;

  @Prop({ type: Number, default: 0 })
  errorCount: number;
}

export type WorkflowExecutionDocument = WorkflowExecution & Document;
export const WorkflowExecutionSchema =
  SchemaFactory.createForClass(WorkflowExecution);

// Indexes
WorkflowExecutionSchema.index({ tenantId: 1, workflowId: 1, customerId: 1 });
WorkflowExecutionSchema.index({ status: 1, nextExecutionAt: 1 });
WorkflowExecutionSchema.index({ customerId: 1, status: 1 });
