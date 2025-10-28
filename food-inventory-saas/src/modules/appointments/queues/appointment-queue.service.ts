import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, Optional } from "@nestjs/common";
import { Queue } from "bullmq";
import {
  APPOINTMENT_REMINDERS_QUEUE,
  APPOINTMENT_REMINDER_JOB,
} from "./appointments.queue.constants";

interface ScheduleReminderParams {
  appointmentId: string;
  tenantId: string;
  reminderAt: Date;
  channels?: string[];
  metadata?: Record<string, any>;
  jobName?: string;
}

@Injectable()
export class AppointmentQueueService {
  private readonly logger = new Logger(AppointmentQueueService.name);

  constructor(
    @Optional()
    @InjectQueue(APPOINTMENT_REMINDERS_QUEUE)
    private readonly reminderQueue: Queue | null,
  ) {}

  /**
   * Programa un recordatorio para una cita utilizando BullMQ.
   * El worker se encargará de evaluar el canal (email/SMS/WhatsApp) más adelante.
   */
  async scheduleReminderJob(params: ScheduleReminderParams): Promise<void> {
    const {
      appointmentId,
      tenantId,
      reminderAt,
      channels,
      metadata,
      jobName = APPOINTMENT_REMINDER_JOB,
    } = params;
    if (!this.reminderQueue) {
      this.logger.debug(
        `BullMQ disabled; skipping reminder for appointment ${appointmentId}`,
      );
      return;
    }

    const delay = reminderAt.getTime() - Date.now();
    const jobDelay = delay > 0 ? delay : 0;

    await this.reminderQueue.add(
      jobName,
      {
        appointmentId,
        tenantId,
        reminderAt: reminderAt.toISOString(),
        channels,
        metadata,
      },
      {
        delay: jobDelay,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
      },
    );

    this.logger.debug(
      `Scheduled ${jobName} for appointment ${appointmentId} (tenant ${tenantId}) at ${reminderAt.toISOString()} with delay ${jobDelay}ms`,
    );
  }
}
