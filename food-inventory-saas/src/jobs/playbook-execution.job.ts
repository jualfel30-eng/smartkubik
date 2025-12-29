import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PlaybooksService } from "../modules/playbooks/playbooks.service";

@Injectable()
export class PlaybookExecutionJob {
  private readonly logger = new Logger(PlaybookExecutionJob.name);

  constructor(private readonly playbooksService: PlaybooksService) {}

  /**
   * Ejecutar cada 5 minutos para procesar pasos de playbooks programados
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePlaybookExecution() {
    this.logger.log("Starting playbook execution job...");

    try {
      await this.playbooksService.processPendingSteps();
      this.logger.log("Playbook execution job completed successfully");
    } catch (error) {
      this.logger.error(
        `Playbook execution job failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
