import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from "@nestjs/swagger";
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

  @Get("summary")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_dashboard_read")
  @ApiOperation({ summary: "Resumen ejecutivo educativo con métricas de alumnos, cuotas y asistencia" })
  @ApiQuery({ name: "academicYear", required: false, example: "2025-2026" })
  async getSummary(@Request() req, @Query("academicYear") academicYear?: string) {
    const year = new Date().getFullYear();
    const resolvedYear = academicYear ?? `${year}-${year + 1}`;
    return this.service.getSummary(req.user.tenantId, resolvedYear);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_dashboard_read")
  @ApiOperation({ summary: "Dashboard educativo (alias del año actual)" })
  async getDashboard(@Request() req) {
    return this.service.getDashboard(req.user.tenantId);
  }
}
