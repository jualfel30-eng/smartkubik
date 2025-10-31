import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { ReportsService } from "./reports.service";
import {
  AccountsReceivableReportQueryDto,
  HospitalityAppointmentsReportQueryDto,
} from "./dto/reports.dto";
import { TenantGuard } from "../../guards/tenant.guard";

@Controller("reports")
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("accounts-receivable")
  getAccountsReceivableReport(
    @Req() req,
    @Query() query: AccountsReceivableReportQueryDto,
  ) {
    return this.reportsService.generateAccountsReceivableAging(
      req.tenantId,
      query.asOfDate,
    );
  }

  @Get("appointments/export")
  exportHospitalityAppointments(
    @Req() req,
    @Query() query: HospitalityAppointmentsReportQueryDto,
  ) {
    return this.reportsService.exportHospitalityAppointments(req.tenantId, {
      startDate: query.startDate,
      endDate: query.endDate,
      locationId: query.locationId,
      status: query.status,
      includeHousekeeping: query.includeHousekeeping,
      format: query.format || "csv",
    });
  }
}
