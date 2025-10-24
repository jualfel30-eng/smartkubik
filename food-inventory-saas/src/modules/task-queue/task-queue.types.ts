import type { QueueDriver } from "./task-queue.constants";
import type { TaskQueueJobStatus } from "../../schemas/task-queue-job.schema";

export interface OrderAccountingJobData {
  orderId: string;
  tenantId: string;
  trigger?: string;
}

export interface InventoryMaintenanceJobData {
  inventoryId: string;
  tenantId: string;
  trigger?: string;
  userId?: string;
}

export interface AnalyticsKpiJobData {
  tenantId: string;
  trigger?: string;
  date?: string;
}

export type TaskQueueJobPayloads = {
  "order-accounting": OrderAccountingJobData;
  "inventory-maintenance": InventoryMaintenanceJobData;
  "analytics-kpi": AnalyticsKpiJobData;
};

export type TaskQueueJobType = keyof TaskQueueJobPayloads;

export type TaskQueueJob = {
  [K in TaskQueueJobType]: { type: K; data: TaskQueueJobPayloads[K] };
}[TaskQueueJobType];

export interface TaskQueueStats {
  driver: QueueDriver;
  concurrency: number;
  maxAttempts: number;
  pending: number;
  active: number;
  failed: number;
  delayed: number;
  nextAvailableAt: string | null;
  lastFailureAt: string | null;
  supportsPersistence: boolean;
}

export interface TaskQueueJobView {
  id: string | null;
  type: TaskQueueJobType | string;
  status: TaskQueueJobStatus;
  attempts: number;
  availableAt: string | null;
  lockedAt: string | null;
  errorMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  payloadSummary: Record<string, unknown>;
  supportsRetry: boolean;
}

export interface ListQueueJobsOptions {
  status?: TaskQueueJobStatus;
  limit?: number;
  skip?: number;
}
