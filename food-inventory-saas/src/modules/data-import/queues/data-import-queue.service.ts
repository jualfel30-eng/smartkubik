import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { DATA_IMPORT_QUEUE, DATA_IMPORT_JOB } from "./data-import.constants";
import { ImportJob, ImportJobDocument } from "../schemas/import-job.schema";

@Injectable()
export class DataImportQueueService {
  private readonly logger = new Logger(DataImportQueueService.name);

  constructor(
    @InjectQueue(DATA_IMPORT_QUEUE) private readonly importQueue: Queue,
    @InjectModel(ImportJob.name) private readonly importJobModel: Model<ImportJobDocument>,
  ) {}

  async enqueueImport(importJobId: string, user: any): Promise<string> {
    const job = await this.importQueue.add(
      DATA_IMPORT_JOB,
      {
        importJobId,
        userId: user.id || user._id?.toString(),
        tenantId: user.tenantId,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    );

    // Store Bull job ID on import job
    await this.importJobModel.findByIdAndUpdate(importJobId, {
      $set: { bullJobId: job.id },
    });

    this.logger.log(
      `Import job ${importJobId} enqueued as Bull job ${job.id}`,
    );

    return job.id!;
  }
}
