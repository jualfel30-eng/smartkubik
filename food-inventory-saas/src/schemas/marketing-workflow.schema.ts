import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export enum WorkflowStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  ARCHIVED = "archived",
}

export enum WorkflowStepType {
  SEND_EMAIL = "send_email",
  SEND_SMS = "send_sms",
  SEND_WHATSAPP = "send_whatsapp",
  WAIT = "wait",
  CONDITION = "condition",
  ADD_TAG = "add_tag",
  REMOVE_TAG = "remove_tag",
  UPDATE_SEGMENT = "update_segment",
  WEBHOOK = "webhook",
}

export enum WorkflowTriggerType {
  MANUAL = "manual",
  EVENT = "event",
  SCHEDULED = "scheduled",
  CUSTOMER_ADDED_TO_SEGMENT = "customer_added_to_segment",
  CUSTOMER_ACTION = "customer_action",
}

export enum ConditionOperator {
  EQUALS = "equals",
  NOT_EQUALS = "not_equals",
  GREATER_THAN = "greater_than",
  LESS_THAN = "less_than",
  CONTAINS = "contains",
  NOT_CONTAINS = "not_contains",
  IN = "in",
  NOT_IN = "not_in",
}

@Schema()
export class WorkflowStep {
  @Prop({ required: true })
  id: string; // Unique identifier for the step

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, enum: WorkflowStepType, required: true })
  type: WorkflowStepType;

  @Prop({ type: Number, required: true })
  order: number;

  // For communication steps (email, SMS, WhatsApp)
  @Prop({ type: Types.ObjectId, ref: "MarketingCampaign" })
  campaignId?: Types.ObjectId;

  @Prop()
  subject?: string;

  @Prop()
  message?: string;

  @Prop({ type: [String] })
  media?: string[];

  // For wait steps
  @Prop({ type: Number })
  waitDuration?: number; // in hours

  @Prop()
  waitUntilDate?: Date;

  // For condition steps
  @Prop({ type: Object })
  condition?: {
    field: string; // e.g., 'totalOrders', 'totalSpent', 'tier'
    operator: ConditionOperator;
    value: any;
  };

  @Prop({ type: String })
  trueStepId?: string; // Next step if condition is true

  @Prop({ type: String })
  falseStepId?: string; // Next step if condition is false

  // For tag/segment steps
  @Prop({ type: [String] })
  tags?: string[];

  @Prop({ type: String })
  segmentId?: string;

  // For webhook steps
  @Prop()
  webhookUrl?: string;

  @Prop({ type: Object })
  webhookPayload?: Record<string, any>;

  // General
  @Prop({ type: String })
  nextStepId?: string; // Next step in sequence (for non-condition steps)

  @Prop({ type: Boolean, default: true })
  enabled: boolean;
}

const WorkflowStepSchema = SchemaFactory.createForClass(WorkflowStep);

@Schema({ timestamps: true })
export class MarketingWorkflow {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: String, enum: WorkflowStatus, default: WorkflowStatus.DRAFT })
  status: WorkflowStatus;

  // Trigger configuration
  @Prop({ type: String, enum: WorkflowTriggerType, required: true })
  triggerType: WorkflowTriggerType;

  @Prop({ type: Object })
  triggerConfig?: {
    eventType?: string;
    segmentId?: string;
    actionType?: string;
    scheduleId?: string;
  };

  // Workflow steps
  @Prop({ type: [WorkflowStepSchema], default: [] })
  steps: WorkflowStep[];

  @Prop({ type: String })
  firstStepId?: string; // Entry point of workflow

  // Entry criteria (who can enter this workflow)
  @Prop({ type: Object })
  entryCriteria?: {
    segmentIds?: string[];
    customerTiers?: string[];
    tags?: string[];
    minTotalSpent?: number;
    maxTotalSpent?: number;
    minTotalOrders?: number;
    maxTotalOrders?: number;
  };

  // Exit conditions (when to stop workflow for a customer)
  @Prop({ type: Object })
  exitConditions?: {
    customerPerformsAction?: string;
    customerAddedToSegment?: string;
    maxDurationHours?: number;
  };

  // Performance metrics
  @Prop({ type: Number, default: 0 })
  totalEntered: number;

  @Prop({ type: Number, default: 0 })
  totalCompleted: number;

  @Prop({ type: Number, default: 0 })
  totalExited: number;

  @Prop({ type: Number, default: 0 })
  activeCustomers: number;

  // Settings
  @Prop({ type: Boolean, default: false })
  allowReEntry: boolean; // Can customers re-enter after completing?

  @Prop({ type: Number })
  reEntryDelayHours?: number; // Minimum hours before re-entry

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  lastModifiedBy?: Types.ObjectId;
}

export type MarketingWorkflowDocument = MarketingWorkflow & Document;
export const MarketingWorkflowSchema =
  SchemaFactory.createForClass(MarketingWorkflow);

// Indexes
MarketingWorkflowSchema.index({ tenantId: 1, status: 1 });
MarketingWorkflowSchema.index({ triggerType: 1, status: 1 });
