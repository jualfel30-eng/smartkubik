import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { DATA_IMPORT_QUEUE } from "./data-import.constants";
import { DataImportService } from "../data-import.service";

interface ImportJobPayload {
  importJobId: string;
  userId: string;
  tenantId: string;
}

@Processor(DATA_IMPORT_QUEUE)
export class DataImportProcessor extends WorkerHost {
  private readonly logger = new Logger(DataImportProcessor.name);

  constructor(private readonly dataImportService: DataImportService) {
    super();
  }

  async process(job: Job<ImportJobPayload>): Promise<void> {
    const { importJobId, userId, tenantId } = job.data;

    this.logger.log(
      `Processing import job ${importJobId} (Bull job ${job.id}) for tenant ${tenantId}`,
    );

    // Build a minimal user object for the service
    const user = { id: userId, tenantId };

    await this.dataImportService.executeImport(importJobId, user);
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<ImportJobPayload>) {
    this.logger.log(
      `Import Bull job ${job.id} (import ${job.data.importJobId}) completed`,
    );
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<ImportJobPayload>, err: Error) {
    this.logger.error(
      `Import Bull job ${job?.id} (import ${job?.data?.importJobId}) failed: ${err.message}`,
      err.stack,
    );
  }
}
