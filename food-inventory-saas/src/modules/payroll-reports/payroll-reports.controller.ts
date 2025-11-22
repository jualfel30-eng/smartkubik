import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { PayrollReportsService } from "./payroll-reports.service";

@ApiTags("payroll-reports")
@ApiBearerAuth()
@Controller("payroll/reports")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class PayrollReportsController {
  constructor(private readonly reportsService: PayrollReportsService) {}

  @Get("summary")
  @Permissions("payroll_employees_read")
  async summary(@Req() req, @Query() query: any) {
    return this.reportsService.summary(req.user.tenantId, query);
  }

  @Get("deductions-breakdown")
  @Permissions("payroll_employees_read")
  async deductionsBreakdown(@Req() req, @Query() query: any) {
    return this.reportsService.deductionsBreakdown(req.user.tenantId, query);
  }

  @Get("absenteeism")
  @Permissions("payroll_employees_read")
  async absenteeism(@Req() req, @Query() query: any) {
    return this.reportsService.absenteeism(req.user.tenantId, query);
  }
}
