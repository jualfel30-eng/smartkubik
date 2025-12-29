import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RemindersService } from "../modules/reminders/reminders.service";

@Injectable()
export class ReminderProcessingJob {
  private readonly logger = new Logger(ReminderProcessingJob.name);

  constructor(private readonly remindersService: RemindersService) {}

  /**
   * Procesar recordatorios pendientes cada 10 minutos
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleReminderProcessing() {
    this.logger.log("Starting reminder processing job...");

    try {
      const result = await this.remindersService.processPendingReminders();
      this.logger.log(
        `Reminder processing completed: ${result.processed} sent, ${result.failed} failed`,
      );
    } catch (error) {
      this.logger.error(
        `Reminder processing job failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
