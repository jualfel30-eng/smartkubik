import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DateTime } from "luxon";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { AppointmentDocument } from "../../schemas/appointment.schema";

interface CalendarSyncResult {
  googleEventId?: string;
  outlookEventId?: string;
  icsPayload?: string;
}

@Injectable()
export class CalendarIntegrationService {
  private readonly logger = new Logger(CalendarIntegrationService.name);

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async syncAppointment(options: {
    tenantId: string;
    appointment: AppointmentDocument;
  }): Promise<CalendarSyncResult> {
    const { tenantId, appointment } = options;
    const tenant = await this.tenantModel.findById(tenantId).lean();

    if (!tenant?.settings?.integrations?.calendar) {
      return {};
    }

    const calendarSettings = tenant.settings.integrations.calendar;
    const timezone = calendarSettings.timezone || tenant.timezone || "UTC";

    const icsPayload = this.buildIcs(appointment, timezone);
    const result: CalendarSyncResult = { icsPayload };

    if (calendarSettings.google?.enabled) {
      result.googleEventId = this.generateEventId(
        "google",
        appointment._id.toString(),
      );
    }

    if (calendarSettings.outlook?.enabled) {
      result.outlookEventId = this.generateEventId(
        "outlook",
        appointment._id.toString(),
      );
    }

    this.logger.log(
      `Sincronización calendario - tenant=${tenantId} appointment=${appointment._id} google=${result.googleEventId} outlook=${result.outlookEventId}`,
    );

    return result;
  }

  async cancelAppointment(options: {
    tenantId: string;
    appointment: AppointmentDocument;
  }): Promise<void> {
    const { tenantId, appointment } = options;
    const tenant = await this.tenantModel.findById(tenantId).lean();

    if (!tenant?.settings?.integrations?.calendar) {
      return;
    }

    this.logger.log(
      `Cancelación calendario - tenant=${tenantId} appointment=${appointment._id}`,
    );
  }

  private buildIcs(appointment: AppointmentDocument, timezone: string): string {
    const uid = appointment._id.toString();
    const start = DateTime.fromJSDate(
      appointment.startTime instanceof Date
        ? appointment.startTime
        : new Date(appointment.startTime),
    )
      .setZone(timezone)
      .toFormat("yyyyMMdd'T'HHmmss");
    const end = DateTime.fromJSDate(
      appointment.endTime instanceof Date
        ? appointment.endTime
        : new Date(appointment.endTime),
    )
      .setZone(timezone)
      .toFormat("yyyyMMdd'T'HHmmss");

    const summary = appointment.serviceName || "Hospitality Service";
    const description = appointment.notes || "";

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SmartKubik//Hospitality//ES",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${DateTime.utc().toFormat("yyyyMMdd'T'HHmmss'Z'")}`,
      `DTSTART;TZID=${timezone}:${start}`,
      `DTEND;TZID=${timezone}:${end}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
  }

  private generateEventId(prefix: string, base: string): string {
    return `${prefix}_${base}_${Date.now()}`;
  }
}
