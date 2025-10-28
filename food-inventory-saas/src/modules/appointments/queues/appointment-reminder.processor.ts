import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import {
  APPOINTMENT_REMINDERS_QUEUE,
  APPOINTMENT_REMINDER_JOB,
  APPOINTMENT_DEPOSIT_ALERT_JOB,
} from "./appointments.queue.constants";
import { AppointmentsService } from "../appointments.service";

interface ReminderJobPayload {
  appointmentId: string;
  tenantId: string;
  reminderAt: string;
  channels?: string[];
  metadata?: Record<string, any>;
}

@Processor(APPOINTMENT_REMINDERS_QUEUE)
export class AppointmentReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(AppointmentReminderProcessor.name);

  constructor(private readonly appointmentsService: AppointmentsService) {
    super();
  }

  /**
   * Procesa el job enviado desde la cola de recordatorios.
   * Más adelante se integrará con mailer/SMS/WhatsApp.
   */
  async process(job: Job<ReminderJobPayload>): Promise<void> {
    const { appointmentId, tenantId, reminderAt, channels, metadata } = job.data;

    if (job.name === APPOINTMENT_DEPOSIT_ALERT_JOB) {
      this.logger.log(
        `Processing deposit alert ${job.id} for appointment ${appointmentId} (tenant ${tenantId}) scheduled at ${reminderAt}`,
      );
      await this.appointmentsService.handlePendingDepositReminder(
        tenantId,
        appointmentId,
        metadata,
      );
      return;
    }

    this.logger.log(
      `Processing reminder job ${job.id} for appointment ${appointmentId} (tenant ${tenantId}) at ${reminderAt} via ${channels?.join(", ") || "default channels"}`,
    );

    // TODO: integrar con MailService / WhatsApp / SMS en fases posteriores.
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<ReminderJobPayload>) {
    this.logger.debug(
      `Reminder job ${job.id} (${job.name}) completed`,
    );
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<ReminderJobPayload>, err: Error) {
    this.logger.error(
      `Reminder job ${job?.id} (${job?.name}) failed`,
      err.stack,
    );
  }
}
