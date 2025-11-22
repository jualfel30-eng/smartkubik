import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { PayrollWebhooksService } from "./payroll-webhooks.service";

@ApiTags("payroll-webhooks")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("payroll/webhooks")
export class PayrollWebhooksController {
  constructor(private readonly webhooksService: PayrollWebhooksService) {}

  @Get("config")
  @Permissions("payroll_employees_read")
  async getConfig(@Req() req) {
    return this.webhooksService.getConfig(req.user.tenantId);
  }

  @Post("config")
  @Permissions("payroll_employees_write")
  async upsertConfig(@Req() req, @Body() body: any) {
    return this.webhooksService.upsertConfig(req.user.tenantId, body);
  }

  @Post("test")
  @Permissions("payroll_employees_write")
  async sendTest(@Req() req) {
    return this.webhooksService.sendTest(req.user.tenantId);
  }
}
