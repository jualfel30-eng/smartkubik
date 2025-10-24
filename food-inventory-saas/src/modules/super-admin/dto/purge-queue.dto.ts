import { IsIn, IsInt, IsOptional, Min } from "class-validator";
import type { TaskQueueJobStatus } from "../../../schemas/task-queue-job.schema";

export class PurgeQueueDto {
  @IsIn(["failed", "pending"])
  status!: TaskQueueJobStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  olderThanMinutes?: number;
}
