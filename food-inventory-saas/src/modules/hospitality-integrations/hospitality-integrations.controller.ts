import { Body, Controller, Post, Headers } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PmsIntegrationService } from "./pms-integration.service";

@ApiTags("Hospitality Integrations")
@Controller("hospitality/integrations")
export class HospitalityIntegrationsController {
  constructor(private readonly pmsIntegrationService: PmsIntegrationService) {}

  @Post("pms/webhook")
  async handlePmsWebhook(
    @Body() payload: any,
    @Headers("x-tenant-id") tenantId?: string,
  ) {
    await this.pmsIntegrationService.enqueueWebhook(tenantId, payload);
    return { received: true };
  }
}
