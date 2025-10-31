import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import {
  HOSPITALITY_PMS_NIGHTLY_JOB,
  HOSPITALITY_PMS_SYNC_QUEUE,
  HOSPITALITY_PMS_UPSERT_JOB,
} from "../constants";
import { PmsIntegrationService } from "../pms-integration.service";

@Processor(HOSPITALITY_PMS_SYNC_QUEUE)
export class HospitalityPmsSyncProcessor extends WorkerHost {
  constructor(private readonly pmsIntegrationService: PmsIntegrationService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === HOSPITALITY_PMS_UPSERT_JOB) {
      await this.pmsIntegrationService.processReservationUpsert(job as any);
      return;
    }

    if (job.name === HOSPITALITY_PMS_NIGHTLY_JOB) {
      await this.pmsIntegrationService.processNightlyReconcile(job as any);
    }
  }
}
