import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { addDays, format } from "date-fns";
import { Model, Types } from "mongoose";
import { CreateEventDto } from "../../../dto/event.dto";
import {
  PayrollCalendar,
  PayrollCalendarDocument,
} from "../../../schemas/payroll-calendar.schema";
import { Tenant, TenantDocument } from "../../../schemas/tenant.schema";
import { EventsService } from "../../events/events.service";
import { NotificationsService } from "../../notifications/notifications.service";

@Injectable()
export class PayrollCalendarReminderService {
  private readonly logger = new Logger(PayrollCalendarReminderService.name);
  private readonly reminderWindowDays = 5;

  constructor(
    @InjectModel(PayrollCalendar.name)
    private readonly calendarModel: Model<PayrollCalendarDocument>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly eventsService: EventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async scheduleCutoffReminders() {
    const now = new Date();
    const windowEnd = addDays(now, this.reminderWindowDays);

    const calendars = await this.calendarModel
      .find({
        status: { $in: ["draft", "open"] },
        cutoffDate: { $gte: now, $lte: windowEnd },
        $or: [
          { "metadata.reminders.cutoffReminderSent": { $ne: true } },
          { "metadata.reminders.cutoffReminderSentAt": { $exists: false } },
        ],
      })
      .limit(50)
      .lean();

    if (!calendars.length) {
      return;
    }

    for (const calendar of calendars) {
      try {
        const tenantId = this.normalizeTenantId(calendar.tenantId);
        if (!tenantId) continue;
        const calendarId = this.normalizeCalendarId(calendar);
        if (!calendarId) {
          this.logger.warn(
            `Calendario sin _id detectado al generar recordatorio (tenant ${tenantId}). Se omite.`,
          );
          continue;
        }

        const title = `Corte de nómina: ${calendar.name || this.formatRange(calendar)}`;
        const description = `Revisa horas, contratos y ausencias antes del corte del ${this.formatDate(calendar.cutoffDate)}.`;
        const eventDto: CreateEventDto = {
          title,
          description,
          start: new Date(calendar.cutoffDate).toISOString(),
          allDay: true,
          color: "#f97316",
          type: "payroll",
          relatedPayrollCalendarId: calendarId,
        };
        await this.eventsService.create(
          eventDto,
          { id: "000000000000000000000000", tenantId } as any,
          undefined,
          { syncTodo: true },
        );
        const reminderResult = await this.dispatchNotification({
          tenantId,
          calendar,
          calendarId,
        });
        const now = new Date();
        await this.calendarModel.updateOne(
          { _id: calendarId },
          {
            $set: {
              "metadata.reminders.cutoffReminderSent": true,
              "metadata.reminders.cutoffReminderSentAt": now,
              "metadata.reminders.lastRecipients":
                reminderResult.recipients?.map((r) => r.email || r.phone) ?? [],
              "metadata.reminders.lastDispatch": reminderResult,
            },
            $push: {
              "metadata.reminders.history": {
                sentAt: now,
                channels: reminderResult.channels,
                recipientCount: reminderResult.recipients?.length ?? 0,
                successCount: reminderResult.successCount,
                failureCount: reminderResult.failureCount,
                recipients: reminderResult.recipients?.map(
                  (r) => r.email || r.phone,
                ),
              },
            },
          },
        );
      } catch (error) {
        this.logger.warn(
          `No se pudo generar recordatorio para calendario ${this.normalizeCalendarId(calendar) ?? "sin-id"}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  private normalizeTenantId(tenantId: Types.ObjectId | string | undefined) {
    if (!tenantId) return undefined;
    if (tenantId instanceof Types.ObjectId) return tenantId.toHexString();
    return tenantId;
  }

  private formatRange(calendar: PayrollCalendar) {
    const start = this.formatDate(calendar.periodStart);
    const end = this.formatDate(calendar.periodEnd);
    return `${start} – ${end}`;
  }

  private formatDate(value?: Date) {
    if (!value) return "fecha no definida";
    return format(new Date(value), "dd/MM/yyyy");
  }

  private normalizeCalendarId(
    calendar: Partial<PayrollCalendar> & { _id?: Types.ObjectId | string },
  ) {
    const rawId = calendar?._id;
    if (!rawId) return undefined;
    if (rawId instanceof Types.ObjectId) return rawId.toHexString();
    if (typeof rawId === "string") return rawId;
    return undefined;
  }

  private async dispatchNotification(params: {
    tenantId: string;
    calendar: PayrollCalendar;
    calendarId: string;
  }): Promise<{
    recipients: Array<{ email?: string; phone?: string; name?: string }>;
    successCount: number;
    failureCount: number;
    channels: string[];
  }> {
    const { tenantId, calendar, calendarId } = params;
    const tenant = await this.tenantModel
      .findById(tenantId)
      .select(["name", "contactInfo", "settings.payroll"])
      .lean();
    if (!tenant) {
      return { recipients: [], successCount: 0, failureCount: 0, channels: [] };
    }

    const recipients: Array<{ email?: string; phone?: string; name?: string }> =
      [];
    if (tenant.contactInfo?.email) {
      recipients.push({ email: tenant.contactInfo.email, name: tenant.name });
    }
    const payrollSettings: any = tenant.settings?.payroll;
    if (payrollSettings?.notificationEmails) {
      const raw = payrollSettings.notificationEmails;
      const emails: string[] = Array.isArray(raw) ? raw : [raw];
      emails
        .filter((email) => typeof email === "string" && email.length > 3)
        .forEach((email) => recipients.push({ email, name: tenant.name }));
    }
    if (!recipients.length) {
      return { recipients: [], successCount: 0, failureCount: 0, channels: [] };
    }

    const compliance = (calendar.metadata as any)?.complianceFlags || {};
    const normalizedCalendarId =
      this.normalizeCalendarId(calendar) ?? calendarId;
    const context = {
      calendarName: calendar.name || this.formatRange(calendar),
      cutoffDate: this.formatDate(calendar.cutoffDate),
      pendingAbsences: compliance.pendingAbsenceCount ?? 0,
      pendingShifts: compliance.pendingShiftCount ?? 0,
      expiredContracts: compliance.expiredContractCount ?? 0,
      absencesUrl: `${process.env.FRONTEND_URL ?? "https://app.smartkubik.com"}/payroll/absences?status=pending`,
      runsUrl: `${process.env.FRONTEND_URL ?? "https://app.smartkubik.com"}/payroll/runs${normalizedCalendarId ? `?calendarId=${normalizedCalendarId}` : ""}`,
    };

    const results = await Promise.all(
      recipients.map((recipient, index) =>
        this.notificationsService.sendTemplateNotification({
          tenantId,
          customerId: `${tenantId}-payroll-${index}`,
          templateId: "payroll_cutoff_reminder",
          channels: ["email"],
          context: {
            ...context,
            recipientName: recipient.name || tenant.name,
          },
          customerEmail: recipient.email,
          customerPhone: recipient.phone,
        }),
      ),
    );

    const flattened = results.flat();
    const successCount = flattened.filter((r) => r.success).length;
    const failureCount = flattened.length - successCount;

    return {
      recipients,
      successCount,
      failureCount,
      channels: ["email"],
    };
  }
}
