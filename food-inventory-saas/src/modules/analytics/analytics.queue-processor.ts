import { Injectable, Logger } from "@nestjs/common";
import { TaskQueueService } from "../task-queue/task-queue.service";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsKpiJobData } from "../task-queue/task-queue.types";

@Injectable()
export class AnalyticsQueueProcessor {
  private readonly logger = new Logger(AnalyticsQueueProcessor.name);

  constructor(
    private readonly taskQueueService: TaskQueueService,
    private readonly analyticsService: AnalyticsService,
  ) {
    this.taskQueueService.registerHandler("analytics-kpi", (payload) =>
      this.handleAnalyticsJob(payload as AnalyticsKpiJobData),
    );
  }

  private async handleAnalyticsJob(
    payload: AnalyticsKpiJobData,
  ): Promise<void> {
    try {
      const date = payload.date ? new Date(payload.date) : undefined;
      if (Number.isNaN(date?.getTime?.())) {
        this.logger.warn(
          `Fecha inválida recibida para analytics-kpi del tenant ${payload.tenantId}; se ignorará el valor.`,
        );
      }
      await this.analyticsService.calculateAndSaveKpisForTenant(
        payload.tenantId,
        date && !Number.isNaN(date.getTime()) ? date : undefined,
        payload.trigger ?? "queue:analytics",
      );
    } catch (error) {
      this.logger.error(
        `Error procesando analytics-kpi para el tenant ${payload.tenantId}: ${
          error instanceof Error ? error.message : error
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
