import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { OpportunitiesService } from "../opportunities/opportunities.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";
import { decrypt } from "../../utils/encryption.util";

@ApiTags("calendar-webhooks")
@Controller("calendar-webhooks")
export class CalendarWebhookController {
  constructor(
    private readonly opportunitiesService: OpportunitiesService,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    private readonly configService: ConfigService,
  ) {}

  @Post("/event")
  @ApiOperation({ summary: "Webhook inbound de evento de calendario (Google/Microsoft/Apple)" })
  async calendarEvent(@Body() payload: any) {
    // payload esperado: { tenantId, eventId, subject, startAt, endAt, attendees: string[], opportunityId?, threadId? }
    const { tenantId, opportunityId, eventId, attendees = [] } = payload;
    if (!tenantId || !eventId) return { success: false, message: "tenantId y eventId requeridos" };

    let oppId = opportunityId;
    if (!oppId && attendees.length) {
      // Buscar por el primer attendee
      const primary = attendees[0];
      const emailMatch = primary?.match(/<?([^<>\s@]+@[^<>\s@]+)>?/);
      const email = emailMatch ? emailMatch[1].toLowerCase() : primary?.toLowerCase();
      if (email) {
        const opp = await this.opportunitiesService.findOpenOpportunityByContact(email, tenantId);
        oppId = opp?._id?.toString();
      }
    }
    if (!oppId) return { success: false, message: "No se encontró oportunidad para el evento" };

    let subject = payload.subject || "Evento";
    let startAt = payload.startAt;
    let endAt = payload.endAt;

    if ((!payload.subject || !payload.startAt) && tenantId && eventId) {
      const event = await this.fetchGoogleEvent(tenantId, eventId);
      subject = event?.summary || subject;
      startAt = startAt || event?.start?.dateTime || event?.start?.date;
      endAt = endAt || event?.end?.dateTime || event?.end?.date;
    }

    const data = await this.opportunitiesService.logCalendarActivity(
      oppId,
      {
        subject,
        startAt,
        endAt,
        attendees,
        threadId: payload.threadId || eventId,
      },
      { tenantId },
    );
    return { success: true, data };
  }

  @Post("/google/event")
  @ApiOperation({ summary: "Webhook Google Calendar" })
  async googleEvent(@Body() payload: any) {
    return this.calendarEvent(payload);
  }

  @Post("/microsoft/event")
  @ApiOperation({ summary: "Webhook Microsoft Calendar" })
  async microsoftEvent(@Body() payload: any) {
    return this.calendarEvent(payload);
  }

  @Post("/apple/event")
  @ApiOperation({ summary: "Webhook Apple Calendar" })
  async appleEvent(@Body() payload: any) {
    return this.calendarEvent(payload);
  }

  private async fetchGoogleEvent(tenantId: string, eventId: string) {
    try {
      const tenant = await this.tenantModel.findById(tenantId).lean();
      if (
        !tenant?.emailConfig?.gmailAccessToken ||
        !tenant?.emailConfig?.gmailRefreshToken
      ) {
        return null;
      }
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get<string>("GOOGLE_CLIENT_ID"),
        this.configService.get<string>("GOOGLE_CLIENT_SECRET"),
        `${this.configService.get<string>("API_BASE_URL") || "http://localhost:3000"}/api/v1/email-config/gmail/callback`,
      );
      oauth2Client.setCredentials({
        access_token: decrypt(tenant.emailConfig.gmailAccessToken),
        refresh_token: decrypt(tenant.emailConfig.gmailRefreshToken),
      });
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const res = await calendar.events.get({
        calendarId: "primary",
        eventId,
      });
      return res.data;
    } catch (err) {
      return null;
    }
  }
}
