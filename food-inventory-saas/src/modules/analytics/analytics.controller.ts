import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  Headers,
} from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { AnalyticsPeriodQueryDto } from "../../dto/analytics.dto";
import { Public } from "../../decorators/public.decorator";

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Get("debug-status")
  async debugStatus(@Headers("authorization") authHeader: string) {
    // Endpoint TOTALMENTE público - sin guards
    let tokenInfo: any = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const decoded = this.decodeToken(token);
        tokenInfo = {
          hasRole: !!decoded?.role,
          roleName: decoded?.role?.name,
          hasPermissions: Array.isArray(decoded?.role?.permissions),
          permissionsCount: decoded?.role?.permissions?.length || 0,
          permissions: decoded?.role?.permissions || [],
          email: decoded?.email,
        };
      } catch (error) {
        tokenInfo = { error: "Invalid token" };
      }
    }

    return {
      message: "Backend funcionando correctamente",
      timestamp: new Date().toISOString(),
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader
        ? authHeader.substring(0, 20) + "..."
        : null,
      tokenInfo,
      instructions:
        "Si ves este mensaje, el backend está desplegado. Envía tu token en el header Authorization: Bearer <token>",
    };
  }

  private decodeToken(token: string): any {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const payload = Buffer.from(parts[1], "base64").toString("utf8");
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  @Get("debug-permissions")
  async debugPermissions(@Req() req) {
    // Endpoint temporal de debug - ELIMINAR en producción final
    // Requiere JWT y tenant, pero NO permisos (sin @Permissions decorator)
    return {
      hasUser: !!req.user,
      user: req.user
        ? {
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
          }
        : null,
      hasReportsRead: req.user?.role?.permissions?.includes("reports_read"),
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

  /**
   * QUICK WIN: Food Cost Percentage
   * KPI #1 para restaurantes - Costo de ingredientes vs ventas
   */
  @Get("food-cost")
  @Permissions("reports_read")
  async getFoodCost(@Req() req, @Query() query: AnalyticsPeriodQueryDto) {
    const data = await this.analyticsService.getFoodCost(
      req.user.tenantId,
      query.period,
    );
    return { success: true, data };
  }

  /**
   * QUICK WIN #3: Tips Report
   * Reporte de propinas por empleado
   */
  @Get("tips")
  @Permissions("reports_read")
  async getTipsReport(
    @Req() req,
    @Query()
    query: {
      startDate?: string;
      endDate?: string;
      employeeId?: string;
    },
  ) {
    const data = await this.analyticsService.getTipsReport(
      req.user.tenantId,
      query,
    );
    return { success: true, data };
  }

  /**
   * QUICK WIN #4: Menu Engineering
   * Análisis de matriz de menú (Popularidad vs Rentabilidad)
   */
  @Get("menu-engineering")
  @Permissions("reports_read")
  async getMenuEngineering(
    @Req() req,
    @Query() query: AnalyticsPeriodQueryDto,
  ) {
    const data = await this.analyticsService.getMenuEngineering(
      req.user.tenantId,
      query.period,
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
