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

  @Get("debug-permissions")
  async debugPermissions(@Req() req) {
    // Endpoint temporal de debug - ELIMINAR en producción final
    return {
      user: {
        userId: req.user?.userId,
        email: req.user?.email,
        tenantId: req.user?.tenantId,
        role: {
          _id: req.user?.role?._id,
          name: req.user?.role?.name,
          description: req.user?.role?.description,
          permissionsCount: req.user?.role?.permissions?.length || 0,
          permissions: req.user?.role?.permissions || [],
          permissionsType: typeof req.user?.role?.permissions,
          isArray: Array.isArray(req.user?.role?.permissions),
        },
      },
      hasReportsRead: req.user?.role?.permissions?.includes('reports_read'),
      timestamp: new Date().toISOString(),
    };
  }

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

  @Get("hospitality/hotel-ops")
  @Permissions("reports_read")
  async getHospitalityOperations(
    @Req() req,
    @Query()
    query: {
      startDate?: string;
      endDate?: string;
      granularity?: "day" | "week";
    },
  ) {
    const data = await this.analyticsService.getHospitalityOperations(
      req.user.tenantId,
      query,
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
