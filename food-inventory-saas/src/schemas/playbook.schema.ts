import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PlaybookDocument = Playbook & Document;
export type PlaybookExecutionDocument = PlaybookExecution & Document;

export enum PlaybookTriggerType {
  STAGE_ENTRY = "stage_entry",
  SOURCE = "source",
  MANUAL = "manual",
}

export enum PlaybookStepType {
  TASK = "task",
  EMAIL = "email",
  WHATSAPP = "whatsapp",
  WAIT = "wait",
  NOTIFICATION = "notification",
}

@Schema()
export class PlaybookStep {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({
    type: String,
    enum: Object.values(PlaybookStepType),
    required: true,
  })
  type: PlaybookStepType;

  @Prop({ type: Number, required: true })
  order: number;

  @Prop({ type: Number, default: 0 })
  delayMinutes: number; // Delay desde el paso anterior (0 = inmediato)

  // Para TASK
  @Prop({ type: String })
  taskTitle?: string;

  @Prop({ type: String })
  taskDescription?: string;

  @Prop({ type: Number })
  taskDueDays?: number; // Días desde la ejecución del paso

  // Para EMAIL/WHATSAPP
  @Prop({ type: String })
  messageTemplateId?: string;

  @Prop({ type: String })
  messageSubject?: string;

  @Prop({ type: String })
  messageBody?: string;

  // Para WAIT
  @Prop({ type: Number })
  waitMinutes?: number;

  // Para NOTIFICATION
  @Prop({ type: String })
  notificationTitle?: string;

  @Prop({ type: String })
  notificationMessage?: string;

  @Prop({ type: Boolean, default: true })
  active: boolean;
}

export const PlaybookStepSchema = SchemaFactory.createForClass(PlaybookStep);

@Schema({ timestamps: true })
export class Playbook {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(PlaybookTriggerType),
    required: true,
  })
  triggerType: PlaybookTriggerType;

  // Condiciones del trigger
  @Prop({ type: String })
  triggerStage?: string; // Para STAGE_ENTRY

  @Prop({ type: String })
  triggerSource?: string; // Para SOURCE

  @Prop({ type: String })
  triggerPipeline?: string; // new_business, expansion

  // Pasos del playbook
  @Prop({ type: [PlaybookStepSchema], default: [] })
  steps: PlaybookStep[];

  @Prop({ type: Boolean, default: true })
  active: boolean;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;
}

export const PlaybookSchema = SchemaFactory.createForClass(Playbook);

// Índices
PlaybookSchema.index({ tenantId: 1, active: 1 });
PlaybookSchema.index({ tenantId: 1, triggerType: 1, triggerStage: 1 });
PlaybookSchema.index({ tenantId: 1, triggerType: 1, triggerSource: 1 });

// Schema para tracking de ejecuciones de playbooks (idempotencia)
@Schema({ timestamps: true })
export class PlaybookExecution {
  @Prop({ type: Types.ObjectId, ref: "Playbook", required: true })
  playbookId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Opportunity", required: true })
  opportunityId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  stepOrder: number;

  @Prop({ type: Date })
  executedAt?: Date;

  @Prop({ type: Date })
  scheduledFor?: Date;

  @Prop({
    type: String,
    enum: ["pending", "executing", "completed", "failed"],
    default: "pending",
  })
  status: string;

  @Prop({ type: String })
  error?: string;

  @Prop({ type: Types.ObjectId, ref: "Activity" })
  activityId?: Types.ObjectId; // Actividad generada por este paso

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

export const PlaybookExecutionSchema =
  SchemaFactory.createForClass(PlaybookExecution);

// Índices para execuciones
PlaybookExecutionSchema.index({ tenantId: 1, opportunityId: 1, playbookId: 1 });
PlaybookExecutionSchema.index({ tenantId: 1, status: 1, scheduledFor: 1 });
PlaybookExecutionSchema.index({
  tenantId: 1,
  opportunityId: 1,
  playbookId: 1,
  stepOrder: 1,
});
