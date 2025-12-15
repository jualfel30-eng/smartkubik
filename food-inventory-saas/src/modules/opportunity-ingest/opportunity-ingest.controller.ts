import { Body, Controller, Post, Request, BadRequestException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { OpportunitiesService } from "../opportunities/opportunities.service";
import { BulkCaptureDto, CreateOpportunityDto } from "../../dto/opportunity.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { IngestEvent, IngestEventDocument } from "../../schemas/ingest-event.schema";

class WhatsappPayload {
  sender: string; // phone E.164
  name?: string;
  messageId: string;
  text?: string;
  language?: string;
  metadata?: Record<string, any>;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

class EmailPayload {
  from: string; // email
  name?: string;
  messageId: string;
  subject?: string;
  body?: string;
  inReplyTo?: string;
  language?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

@ApiTags("opportunity-ingest")
@Controller("opportunity-ingest")
export class OpportunityIngestController {
  constructor(
    private readonly opportunitiesService: OpportunitiesService,
    @InjectModel(IngestEvent.name)
    private readonly ingestModel: Model<IngestEventDocument>,
  ) {}

  private async ensureNotProcessed(messageId: string, tenantId: string, source: string) {
    if (!messageId) return;
    const exists = await this.ingestModel.findOne({ messageId, tenantId, source }).lean();
    if (exists) {
      throw new BadRequestException("Evento ya procesado");
    }
    await this.ingestModel.create({ messageId, tenantId, source });
  }

  @Post("/whatsapp")
  @ApiOperation({ summary: "Webhook inbound WhatsApp (whapi)" })
  async captureWhatsapp(@Body() payload: WhatsappPayload, @Request() req) {
    const user = req.user || { tenantId: payload?.metadata?.tenantId, id: "system" };
    await this.ensureNotProcessed(payload.messageId, user.tenantId, "whatsapp");
    const region =
      payload.metadata?.region ||
      payload.metadata?.countryCode ||
      payload.metadata?.wa_locale ||
      payload.metadata?.whatsappCountryCode;
    const dto: CreateOpportunityDto = {
      name: payload.name || `WhatsApp ${payload.sender}`,
      customerId: payload.metadata?.customerId, // opcional si ya lo tenemos
      stage: "Prospecto",
      source: "whatsapp",
      channel: "whatsapp",
      language: payload.language,
      messageId: payload.messageId,
      threadId: payload.metadata?.threadId || payload.messageId,
      nextStep: "Responder mensaje",
      nextStepDue: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      utmSource: payload.utmSource || "whatsapp",
      utmMedium: payload.utmMedium,
      utmCampaign: payload.utmCampaign,
      utmTerm: payload.utmTerm,
      utmContent: payload.utmContent,
      timeline: "inbound",
      decisionMaker: payload.name,
      budgetFit: "parcial",
      territory: region,
      phone: payload.sender,
    } as any;

    // Si no hay customerId, intentamos lookup/dedupe vía phone en la capa de service
    const data = await this.opportunitiesService.captureFromForm(dto, user);
    return { success: true, data };
  }

  @Post("/email")
  @ApiOperation({ summary: "Webhook inbound Email/Landing" })
  async captureEmail(@Body() payload: EmailPayload, @Request() req) {
    const user = req.user || { tenantId: payload?.utmContent || payload?.utmCampaign, id: "system" };
    await this.ensureNotProcessed(payload.messageId, user.tenantId, "email");
    const emailMatch = payload.from?.match(/<?([^<>\\s@]+@[^<>\\s@]+)>?/);
    const email = emailMatch ? emailMatch[1].toLowerCase() : payload.from?.toLowerCase();
    const dto: CreateOpportunityDto = {
      name: payload.subject || payload.name || `Email ${payload.from}`,
      customerId: undefined,
      stage: "Prospecto",
      source: "email",
      channel: "email",
      language: payload.language,
      messageId: payload.messageId,
      threadId: payload.inReplyTo || payload.messageId,
      nextStep: "Responder mensaje",
      nextStepDue: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      utmSource: payload.utmSource || "email",
      utmMedium: payload.utmMedium,
      utmCampaign: payload.utmCampaign,
      utmTerm: payload.utmTerm,
      utmContent: payload.utmContent,
      timeline: "inbound",
      decisionMaker: payload.name,
      budgetFit: "parcial",
      email,
      body: payload.body,
    } as any;

    const data = await this.opportunitiesService.captureFromForm(dto, user);
    return { success: true, data };
  }

  @Post("/bulk")
  @ApiOperation({ summary: "Bulk import desde cualquier fuente" })
  async captureBulk(@Body() dto: BulkCaptureDto, @Request() req) {
    const user = req.user || { tenantId: (dto as any)?.tenantId, id: "system" };
    const data = await this.opportunitiesService.captureBulk(dto, user);
    return { success: true, data };
  }
}
