import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { OpportunitiesService } from "../opportunities/opportunities.service";

@ApiTags("mail-webhooks")
@Controller("mail-webhooks")
export class MailWebhookController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Post("/email-inbound")
  @ApiOperation({ summary: "Webhook inbound email (Gmail/Outlook)" })
  async emailInbound(@Body() payload: any) {
    // payload expected: { tenantId, messageId, threadId, from, to, subject, body, opportunityId?, customerId? }
    const { tenantId, opportunityId, messageId, from } = payload;
    if (!tenantId || !messageId)
      return { success: false, message: "tenantId y messageId requeridos" };
    // Resolve opp by provided ID or by contact email if not provided
    let oppId = opportunityId;
    if (!oppId && from) {
      const emailMatch = from.match(/<?([^<>\\s@]+@[^<>\\s@]+)>?/);
      const email = emailMatch ? emailMatch[1].toLowerCase() : from.toLowerCase();
      const opp = await this.opportunitiesService.findOpenOpportunityByContact(
        email,
        tenantId,
      );
      oppId = opp?._id?.toString();
    }
    if (!oppId) return { success: false, message: "opportunityId o contacto requerido" };
    const data = await this.opportunitiesService.logEmailActivity(
      oppId,
      {
        direction: "inbound",
        subject: payload.subject,
        body: payload.body,
        from: payload.from,
        to: payload.to,
        messageId: payload.messageId,
        threadId: payload.threadId,
        channel: "email",
      },
      { tenantId },
    );
    return { success: true, data };
  }

  // Aliases por proveedor para facilitar wiring de webhooks
  @Post("/gmail/inbound")
  @ApiOperation({ summary: "Webhook inbound Gmail" })
  async gmailInbound(@Body() payload: any) {
    return this.emailInbound(payload);
  }

  @Post("/outlook/inbound")
  @ApiOperation({ summary: "Webhook inbound Outlook" })
  async outlookInbound(@Body() payload: any) {
    return this.emailInbound(payload);
  }
}
