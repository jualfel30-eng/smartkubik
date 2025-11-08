import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import {
  APPOINTMENT_REMINDERS_QUEUE,
  APPOINTMENT_REMINDER_JOB,
  APPOINTMENT_DEPOSIT_ALERT_JOB,
} from "./appointments.queue.constants";
import { AppointmentsService } from "../appointments.service";
import {
  NotificationsService,
  NotificationChannel,
} from "../../notifications/notifications.service";

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

  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  /**
   * Procesa el job enviado desde la cola de recordatorios.
   * Más adelante se integrará con mailer/SMS/WhatsApp.
   */
  async process(job: Job<ReminderJobPayload>): Promise<void> {
    const { appointmentId, tenantId, reminderAt, channels, metadata } =
      job.data;

    if (job.name === APPOINTMENT_DEPOSIT_ALERT_JOB) {
      this.logger.log(
        `Processing deposit alert ${job.id} for appointment ${appointmentId} (tenant ${tenantId}) scheduled at ${reminderAt}`,
      );
      await this.appointmentsService.handlePendingDepositReminder(
        tenantId,
        appointmentId,
        metadata,
      );
      await this.dispatchHospitalityNotification({
        tenantId,
        appointmentId,
        requestedChannels: channels,
        explicitTemplate: metadata?.templateId || "hospitality_reminder_24h",
        jobName: job.name,
      });
      return;
    }

    this.logger.log(
      `Processing reminder job ${job.id} for appointment ${appointmentId} (tenant ${tenantId}) at ${reminderAt} via ${channels?.join(", ") || "default channels"}`,
    );

    await this.dispatchHospitalityNotification({
      tenantId,
      appointmentId,
      requestedChannels: channels,
      explicitTemplate: metadata?.templateId,
      jobName: job.name,
    });
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<ReminderJobPayload>) {
    this.logger.debug(`Reminder job ${job.id} (${job.name}) completed`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<ReminderJobPayload>, err: Error) {
    this.logger.error(
      `Reminder job ${job?.id} (${job?.name}) failed`,
      err.stack,
    );
  }

  private async dispatchHospitalityNotification(params: {
    tenantId: string;
    appointmentId: string;
    requestedChannels?: string[];
    explicitTemplate?: string;
    jobName: string;
  }): Promise<void> {
    const context =
      await this.appointmentsService.buildHospitalityNotificationContext(
        params.tenantId,
        params.appointmentId,
      );

    if (!context) {
      return;
    }

    const templateId =
      params.explicitTemplate || this.resolveTemplateForJob(params.jobName);
    const channels = this.resolveChannels(
      params.requestedChannels,
      context.preferredChannels,
    );

    await this.notificationsService.sendAppointmentNotification({
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      customerId: context.customerId,
      customerEmail: context.customerEmail || undefined,
      customerPhone: context.customerPhone || undefined,
      whatsappChatId: context.whatsappChatId || undefined,
      language: context.language || undefined,
      templateId,
      channels,
      context: context.templateContext,
    });

    await this.appointmentsService.markReminderDispatched(
      params.tenantId,
      params.appointmentId,
      params.jobName,
      channels,
    );
  }

  private resolveChannels(
    requested: string[] | undefined,
    fallback: string[],
  ): NotificationChannel[] {
    const normalized = new Set<string>();
    (requested && requested.length ? requested : fallback).forEach(
      (channel) => {
        if (!channel) {
          return;
        }
        const lower = channel.toLowerCase();
        if (["email", "sms", "whatsapp"].includes(lower)) {
          normalized.add(lower);
        }
      },
    );
    if (normalized.size === 0) {
      return ["email", "whatsapp"];
    }
    return Array.from(normalized) as NotificationChannel[];
  }

  private resolveTemplateForJob(jobName: string): string {
    if (jobName === APPOINTMENT_REMINDER_JOB) {
      return "hospitality_reminder_24h";
    }
    if (jobName === APPOINTMENT_DEPOSIT_ALERT_JOB) {
      return "hospitality_reminder_24h";
    }
    return "hospitality_reminder_2h";
  }
}
