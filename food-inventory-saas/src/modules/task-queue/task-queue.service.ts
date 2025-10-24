import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model } from "mongoose";
import { DEFAULT_QUEUE_DRIVER, QueueDriver } from "./task-queue.constants";
import {
  TaskQueueJob,
  ListQueueJobsOptions,
  TaskQueueJobPayloads,
  TaskQueueJobType,
  TaskQueueJobView,
  TaskQueueStats,
} from "./task-queue.types";
import {
  TaskQueueJob as TaskQueueJobEntity,
  TaskQueueJobDocument,
} from "../../schemas/task-queue-job.schema";
import type { TaskQueueJobStatus } from "../../schemas/task-queue-job.schema";

type QueueHandler<K extends TaskQueueJobType = TaskQueueJobType> = (
  data: TaskQueueJobPayloads[K],
) => Promise<void>;

interface QueueItem<K extends TaskQueueJobType = TaskQueueJobType> {
  type: K;
  data: TaskQueueJobPayloads[K];
  attempts: number;
}

type TaskQueueJobLean = {
  _id: { toString(): string } | string;
  type: TaskQueueJobType | string;
  payload: Record<string, unknown>;
  status: TaskQueueJobStatus;
  attempts?: number;
  availableAt?: Date | null;
  lockedAt?: Date | null;
  errorMessage?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class TaskQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskQueueService.name);
  private driver: QueueDriver;
  private readonly concurrency: number;
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly queue: QueueItem[] = [];
  private readonly handlers = new Map<TaskQueueJobType, QueueHandler>();
  private activeCount = 0;
  private pendingTimers = 0;
  private shuttingDown = false;
  private processingMongo = false;
  private pollTimer?: NodeJS.Timeout;
  private readonly mongoPollIntervalMs: number;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(TaskQueueJobEntity.name)
    private readonly jobModel: Model<TaskQueueJobDocument>,
  ) {
    this.driver = this.resolveDriver();
    this.concurrency = this.resolveConcurrency();
    this.maxAttempts = this.resolveMaxAttempts();
    this.baseDelayMs = this.resolveBaseDelay();
    this.mongoPollIntervalMs = this.resolveMongoPollInterval();
  }

  async onModuleInit(): Promise<void> {
    if (this.driver === "mongo") {
      await this.recoverStuckJobs();
      this.pollTimer = setInterval(() => {
        if (!this.shuttingDown) {
          void this.processMongoQueue();
        }
      }, this.mongoPollIntervalMs);
      void this.processMongoQueue();
    }

    this.logger.log(
      `Task queue inicializada (driver=${this.driver}) con ${this.concurrency} workers y ${this.maxAttempts} intentos máximos por trabajo.`,
    );
  }

  registerHandler<K extends TaskQueueJobType>(
    type: K,
    handler: QueueHandler<K>,
  ): void {
    if (this.handlers.has(type)) {
      this.logger.warn(
        `Ya existe un handler registrado para el tipo de trabajo "${type}"; será sobrescrito.`,
      );
    }
    this.handlers.set(type, handler as QueueHandler);
  }

  async enqueueOrderAccounting(
    orderId: string,
    tenantId: string,
    trigger?: string,
  ): Promise<void> {
    await this.enqueue("order-accounting", { orderId, tenantId, trigger });
  }

  async enqueueInventoryMaintenance(
    inventoryId: string,
    tenantId: string,
    options: { trigger?: string; userId?: string } = {},
  ): Promise<void> {
    await this.enqueue("inventory-maintenance", {
      inventoryId,
      tenantId,
      trigger: options.trigger,
      userId: options.userId,
    });
  }

  async enqueueAnalyticsKpi(
    tenantId: string,
    options: { trigger?: string; date?: Date } = {},
  ): Promise<void> {
    await this.enqueue("analytics-kpi", {
      tenantId,
      trigger: options.trigger,
      date: options.date?.toISOString(),
    });
  }

  async getStats(): Promise<TaskQueueStats> {
    if (this.driver === "mongo") {
      const [pending, active, failed, nextPending, lastFailed] = await Promise.all([
        this.jobModel.countDocuments({ status: "pending" }).exec(),
        this.jobModel.countDocuments({ status: "active" }).exec(),
        this.jobModel.countDocuments({ status: "failed" }).exec(),
        this.jobModel
          .findOne({ status: "pending" })
          .sort({ availableAt: 1, createdAt: 1 })
          .select({ availableAt: 1 })
          .lean()
          .exec(),
        this.jobModel
          .findOne({ status: "failed" })
          .sort({ updatedAt: -1 })
          .select({ updatedAt: 1 })
          .lean()
          .exec(),
      ]);

      const typedNextPending = nextPending as unknown as {
        availableAt?: Date | null;
      } | null;
      const typedLastFailed = lastFailed as unknown as {
        updatedAt?: Date | null;
      } | null;

      const nextAvailableAt =
        typedNextPending?.availableAt instanceof Date
          ? typedNextPending.availableAt.toISOString()
          : null;
      const lastFailureAt =
        typedLastFailed?.updatedAt instanceof Date
          ? typedLastFailed.updatedAt.toISOString()
          : null;

      return {
        driver: this.driver,
        concurrency: this.concurrency,
        maxAttempts: this.maxAttempts,
        pending,
        active,
        failed,
        delayed: 0,
        nextAvailableAt,
        lastFailureAt,
        supportsPersistence: true,
      };
    }

    return {
      driver: this.driver,
      concurrency: this.concurrency,
      maxAttempts: this.maxAttempts,
      pending: this.queue.length,
      active: this.activeCount,
      failed: 0,
      delayed: this.pendingTimers,
      nextAvailableAt: null,
      lastFailureAt: null,
      supportsPersistence: false,
    };
  }

  async listJobs(options: ListQueueJobsOptions = {}): Promise<TaskQueueJobView[]> {
    if (this.driver !== "mongo") {
      return this.queue.map((item) => ({
        id: null,
        type: item.type,
        status: "pending",
        attempts: item.attempts,
        availableAt: null,
        lockedAt: null,
        errorMessage: null,
        createdAt: null,
        updatedAt: null,
        payloadSummary: this.summarizePayload(item.data),
        supportsRetry: false,
      }));
    }

    const filter: FilterQuery<TaskQueueJobDocument> = {};
    if (options.status) {
      filter.status = options.status;
    }

    const limit = options.limit && options.limit > 0 ? options.limit : 25;
    const skip = options.skip && options.skip > 0 ? options.skip : 0;

    const jobs = await this.jobModel
      .find(filter)
      .sort({
        status: 1,
        availableAt: 1,
        updatedAt: -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const typedJobs = jobs as unknown as TaskQueueJobLean[];
    return typedJobs.map((job) => this.mapMongoJob(job));
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    await this.waitUntilSettled();
  }

  private async enqueue<K extends TaskQueueJobType>(
    type: K,
    data: TaskQueueJobPayloads[K],
  ): Promise<void> {
    if (this.shuttingDown) {
      this.logger.warn(
        `Ignorando nuevo trabajo "${type}" porque la aplicación se está apagando.`,
      );
      return;
    }

    if (!this.handlers.has(type)) {
      this.logger.warn(
        `No existe handler para el tipo de trabajo "${type}"; el mensaje se descartará inmediatamente.`,
      );
      return;
    }

    if (this.driver === "mongo") {
      await this.jobModel.create({
        type,
        payload: data as unknown as Record<string, unknown>,
        status: "pending",
        attempts: 0,
        availableAt: new Date(),
      });
      void this.processMongoQueue();
      return;
    }

    this.queue.push({ type, data, attempts: 0 } as QueueItem);
    this.processMemoryQueue();
  }

  private processMemoryQueue(): void {
    if (this.shuttingDown) {
      return;
    }

    while (this.activeCount < this.concurrency) {
      const next = this.queue.shift();
      if (!next) {
        break;
      }
      this.executeMemoryItem(next);
    }
  }

  private executeMemoryItem(item: QueueItem): void {
    this.activeCount++;
    this.runMemoryJob(item)
      .catch((error) => {
        this.logger.error(
          `Error inesperado ejecutando trabajo "${item.type}": ${
            error instanceof Error ? error.message : error
          }`,
          error instanceof Error ? error.stack : undefined,
        );
      })
      .finally(() => {
        this.activeCount = Math.max(0, this.activeCount - 1);
        this.processMemoryQueue();
      });
  }

  private async runMemoryJob(item: QueueItem): Promise<void> {
    try {
      const handler = this.handlers.get(item.type);
      if (!handler) {
        this.logger.warn(
          `No se encontró handler al procesar el trabajo "${item.type}"; se descartará.`,
        );
        return;
      }

      await handler(item.data as never);
    } catch (error) {
      this.handleMemoryJobFailure(item, error);
    }
  }

  private handleMemoryJobFailure(item: QueueItem, error: unknown): void {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error ?? {});
    this.logger.warn(
      `Fallo al procesar trabajo "${item.type}" (intento ${
        item.attempts + 1
      }/${this.maxAttempts}): ${message}`,
    );

    if (item.attempts + 1 >= this.maxAttempts) {
      this.logger.error(
        `Se agotaron los intentos para el trabajo "${item.type}"; se omitirá su procesamiento automático.`,
        error instanceof Error ? error.stack : undefined,
      );
      return;
    }

    const delay = this.calculateDelay(item.attempts);
    item.attempts += 1;
    this.pendingTimers += 1;

    setTimeout(() => {
      this.pendingTimers = Math.max(0, this.pendingTimers - 1);
      this.queue.push(item);
      this.processMemoryQueue();
    }, delay);
  }

  private async processMongoQueue(): Promise<void> {
    if (this.shuttingDown || this.processingMongo) {
      return;
    }

    this.processingMongo = true;

    try {
      while (!this.shuttingDown && this.activeCount < this.concurrency) {
        const now = new Date();
        const job = await this.jobModel
          .findOneAndUpdate(
            {
              status: "pending",
              availableAt: { $lte: now },
            },
            {
              $set: { status: "active", lockedAt: now },
            },
            {
              sort: { availableAt: 1, createdAt: 1 },
              new: true,
            },
          )
          .exec();

        if (!job) {
          break;
        }

        this.activeCount += 1;

        void this.runMongoJob(job)
          .catch((error) => {
            this.logger.error(
              `Error inesperado ejecutando trabajo "${job.type}": ${
                error instanceof Error ? error.message : error
              }`,
              error instanceof Error ? error.stack : undefined,
            );
          })
          .finally(() => {
            this.activeCount = Math.max(0, this.activeCount - 1);
            if (!this.shuttingDown) {
              void this.processMongoQueue();
            }
          });
      }
    } finally {
      this.processingMongo = false;
    }
  }

  private async runMongoJob(job: TaskQueueJobDocument): Promise<void> {
    const handler = this.handlers.get(job.type as TaskQueueJobType);

    if (!handler) {
      this.logger.warn(
        `No existe handler registrado para el tipo de trabajo "${job.type}"; el mensaje se descartará.`,
      );
      await this.jobModel.deleteOne({ _id: job._id }).exec();
      return;
    }

    try {
      await handler(job.payload as never);
      await this.jobModel.deleteOne({ _id: job._id }).exec();
    } catch (error) {
      await this.handleMongoJobFailure(job, error);
    }
  }

  private async handleMongoJobFailure(
    job: TaskQueueJobDocument,
    error: unknown,
  ): Promise<void> {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error ?? {});
    const nextAttempt = job.attempts + 1;

    this.logger.warn(
      `Fallo al procesar trabajo "${job.type}" (intento ${nextAttempt}/${this.maxAttempts}): ${message}`,
    );

    if (nextAttempt >= this.maxAttempts) {
      await this.jobModel
        .findByIdAndUpdate(job._id, {
          status: "failed",
          attempts: nextAttempt,
          lockedAt: null,
          availableAt: null,
          errorMessage: message,
        })
        .exec();

      this.logger.error(
        `Se agotaron los intentos para el trabajo "${job.type}"; se omitirá su procesamiento automático.`,
        error instanceof Error ? error.stack : undefined,
      );
      return;
    }

    const delay = this.calculateDelay(job.attempts);
    await this.jobModel
      .findByIdAndUpdate(job._id, {
        status: "pending",
        attempts: nextAttempt,
        lockedAt: null,
        availableAt: new Date(Date.now() + delay),
        errorMessage: message,
      })
      .exec();
  }

  private async recoverStuckJobs(): Promise<void> {
    if (this.driver !== "mongo") {
      return;
    }

    const now = new Date();
    const result = await this.jobModel
      .updateMany(
        { status: "active" },
        {
          $set: { status: "pending", lockedAt: null, availableAt: now },
        },
      )
      .exec();

    if (result?.modifiedCount) {
      this.logger.warn(
        `Se recuperaron ${result.modifiedCount} trabajos activos al reiniciar la cola; se reintentará su ejecución.`,
      );
    }
  }

  async retryJob(jobId: string): Promise<void> {
    this.assertPersistentDriver();

    const job = await this.jobModel.findById(jobId).exec();
    if (!job) {
      throw new NotFoundException("No se encontró el trabajo solicitado");
    }

    await this.jobModel
      .findByIdAndUpdate(jobId, {
        status: "pending",
        attempts: 0,
        lockedAt: null,
        errorMessage: null,
        availableAt: new Date(),
      })
      .exec();

    this.logger.log(`Trabajo ${jobId} reenviado a la cola (${job.type}).`);
    if (!this.shuttingDown) {
      void this.processMongoQueue();
    }
  }

  async deleteJob(jobId: string): Promise<void> {
    this.assertPersistentDriver();

    const result = await this.jobModel.deleteOne({ _id: jobId }).exec();
    if (!result.deletedCount) {
      throw new NotFoundException("No se encontró el trabajo solicitado");
    }

    this.logger.log(`Trabajo ${jobId} eliminado manualmente de la cola.`);
  }

  async purgeJobs(
    status: TaskQueueJobStatus,
    olderThanMinutes?: number,
  ): Promise<number> {
    this.assertPersistentDriver();

    const filter: FilterQuery<TaskQueueJobDocument> = { status };
    if (olderThanMinutes && olderThanMinutes > 0) {
      const threshold = new Date(Date.now() - olderThanMinutes * 60_000);
      filter.updatedAt = { $lte: threshold };
    }

    const result = await this.jobModel.deleteMany(filter).exec();
    const deleted = result.deletedCount ?? 0;

    if (deleted > 0) {
      this.logger.log(
        `Se eliminaron ${deleted} trabajos con estado ${status} de la cola.`,
      );
    }

    return deleted;
  }

  private mapMongoJob(job: TaskQueueJobLean): TaskQueueJobView {
    return {
      id: job._id.toString(),
      type: job.type,
      status: job.status,
      attempts: job.attempts ?? 0,
      availableAt:
        job.availableAt instanceof Date
          ? job.availableAt.toISOString()
          : null,
      lockedAt:
        job.lockedAt instanceof Date ? job.lockedAt.toISOString() : null,
      errorMessage: job.errorMessage ?? null,
      createdAt:
        job.createdAt instanceof Date ? job.createdAt.toISOString() : null,
      updatedAt:
        job.updatedAt instanceof Date ? job.updatedAt.toISOString() : null,
      payloadSummary: this.summarizePayload(job.payload),
      supportsRetry: job.status === "failed",
    };
  }

  private summarizePayload(payload: unknown): Record<string, unknown> {
    if (!payload || typeof payload !== "object") {
      return {};
    }

    return Object.entries(payload as Record<string, unknown>).reduce<
      Record<string, unknown>
    >(
      (acc, [key, value]) => {
        if (typeof value === "string") {
          acc[key] = value.length > 80 ? `${value.slice(0, 77)}...` : value;
        } else if (
          typeof value === "number" ||
          typeof value === "boolean" ||
          value === null
        ) {
          acc[key] = value;
        } else if (value instanceof Date) {
          acc[key] = value.toISOString();
        } else if (Array.isArray(value)) {
          acc[key] = `[${value.length} elementos]`;
        } else if (typeof value === "object") {
          acc[key] = `{${Object.keys(value as Record<string, unknown>).length} claves}`;
        }

        return acc;
      },
      {},
    );
  }

  private assertPersistentDriver(): void {
    if (this.driver !== "mongo") {
      throw new BadRequestException(
        "La cola en memoria no soporta operaciones administrativas.",
      );
    }
  }

  private calculateDelay(previousAttempts: number): number {
    const exponential = Math.pow(2, previousAttempts);
    return this.baseDelayMs * exponential;
  }

  private resolveDriver(): QueueDriver {
    const explicitDriver = this.configService.get<string>("QUEUE_DRIVER");
    if (explicitDriver === "mongo" || explicitDriver === "memory") {
      return explicitDriver;
    }

    return DEFAULT_QUEUE_DRIVER;
  }

  private resolveConcurrency(): number {
    const raw = this.configService.get<string>(
      "ORDER_ACCOUNTING_QUEUE_CONCURRENCY",
    );
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 2;
    }
    return parsed;
  }

  private resolveMaxAttempts(): number {
    const raw = this.configService.get<string>(
      "ORDER_ACCOUNTING_QUEUE_ATTEMPTS",
    );
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 3;
    }
    return parsed;
  }

  private resolveBaseDelay(): number {
    const raw = this.configService.get<string>(
      "ORDER_ACCOUNTING_QUEUE_BACKOFF_MS",
    );
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 2000;
    }
    return parsed;
  }

  private resolveMongoPollInterval(): number {
    const raw = this.configService.get<string>("TASK_QUEUE_POLL_INTERVAL_MS");
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 1000;
    }
    return parsed;
  }

  private async waitUntilSettled(): Promise<void> {
    if (this.driver === "mongo") {
      while (this.activeCount > 0 || this.processingMongo) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return;
    }

    while (
      this.activeCount > 0 ||
      this.queue.length > 0 ||
      this.pendingTimers > 0
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}
