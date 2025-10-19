import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { AnalyticsPeriodQueryDto } from "../../dto/analytics.dto";

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("performance")
  @Permissions("reports_read")
  async getPerformanceReport(
    @Req() req,
    @Query() query: AnalyticsPeriodQueryDto & { date?: string },
  ) {
    if (query.period) {
      const data = await this.analyticsService.getPerformanceSummary(
        req.user.tenantId,
        query.period,
      );
      return { success: true, data };
    }

    const reportDate = query.date ? new Date(query.date) : new Date();
    const data = await this.analyticsService.getPerformanceKpis(
      req.user.tenantId,
      reportDate,
    );
    return { success: true, data };
  }

  @Get("sales-trend")
  @Permissions("reports_read")
  async getSalesTrend(@Req() req, @Query() query: AnalyticsPeriodQueryDto) {
    const data = await this.analyticsService.getSalesTrend(
      req.user.tenantId,
      query.period,
    );
    return { success: true, data };
  }

  @Get("inventory-status")
  @Permissions("reports_read")
  async getInventoryStatus(
    @Req() req,
    @Query() query: AnalyticsPeriodQueryDto,
  ) {
    const data = await this.analyticsService.getInventoryStatus(
      req.user.tenantId,
      query.period,
    );
    return { success: true, data };
  }

  @Get("profit-and-loss")
  @Permissions("reports_read")
  async getProfitAndLoss(@Req() req, @Query() query: AnalyticsPeriodQueryDto) {
    const data = await this.analyticsService.getProfitAndLoss(
      req.user.tenantId,
      query.period,
    );
    return { success: true, data };
  }

  @Get("customer-segmentation")
  @Permissions("reports_read")
  async getCustomerSegmentation(@Req() req) {
    const data = await this.analyticsService.getCustomerSegmentation(
      req.user.tenantId,
    );
    return { success: true, data };
  }

  @Get("trigger-kpi-calculation")
  @Permissions("tenant_settings_read") // Protect this admin-only endpoint
  async triggerCalculation(@Req() req) {
    // This is for testing purposes and should be removed or properly secured in production.
    await this.analyticsService.calculateAndSaveKpisForTenant(
      req.user.tenantId,
    );
    return {
      success: true,
      message: "Cálculo de KPIs para el día de ayer disparado manualmente.",
    };
  }
}
