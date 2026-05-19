import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { EduDashboardService } from "./edu-dashboard.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("education-dashboard")
@Controller("education/dashboard")
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class EduDashboardController {
  constructor(private readonly service: EduDashboardService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_dashboard_read")
  async getDashboard(@Request() req) {
    return this.service.getDashboard(req.user.tenantId);
  }
}
