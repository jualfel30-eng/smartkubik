import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes } from "mongoose";

export type TaskQueueJobDocument = HydratedDocument<TaskQueueJob>;

export type TaskQueueJobStatus = "pending" | "active" | "failed";

@Schema({ timestamps: true })
export class TaskQueueJob {
  @Prop({ required: true })
  type!: string;

  @Prop({ type: SchemaTypes.Mixed, required: true })
  payload!: Record<string, unknown>;

  @Prop({ type: String, required: true, default: "pending", index: true })
  status!: TaskQueueJobStatus;

  @Prop({ type: Number, required: true, default: 0 })
  attempts!: number;

  @Prop({ type: Date, index: true })
  availableAt?: Date;

  @Prop({ type: Date })
  lockedAt?: Date;

  @Prop({ type: String })
  errorMessage?: string;
}

export const TaskQueueJobSchema = SchemaFactory.createForClass(TaskQueueJob);

TaskQueueJobSchema.index({ status: 1, availableAt: 1, createdAt: 1 });
