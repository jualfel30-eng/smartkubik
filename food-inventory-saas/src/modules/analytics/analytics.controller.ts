import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Req,
  Headers,
} from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import {
  AnalyticsPeriodQueryDto,
  KpiCompareQueryDto,
  ExpenseIncomeBreakdownQueryDto,
  CustomMetricsQueryDto,
  CreateSavedViewDto,
  UpdateSavedViewDto,
} from "../../dto/analytics.dto";
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

  /**
   * KPIs Financieros Consolidados
   * Retorna los 10 KPIs financieros clave para el dueño del negocio:
   * Ticket Promedio, Margen Bruto, Margen de Contribución, Costos Fijos/Variables,
   * Margen Neto, Punto de Equilibrio, Rotación de Inventario, Liquidez, EBITDA, ROI
   */
  @Get("financial-kpis")
  @Permissions("reports_read")
  async getFinancialKpis(@Req() req, @Query() query: AnalyticsPeriodQueryDto) {
    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;
    const data = await this.analyticsService.getFinancialKpis(
      req.user.tenantId,
      query.period,
      query.compare === "true",
      fromDate,
      toDate,
    );
    return { success: true, data };
  }

  /**
   * Get custom metrics based on user selection (Phase 2)
   * Power BI-style dynamic metric builder
   */
  @Get("custom-metrics")
  @Permissions("reports_read")
  async getCustomMetrics(@Req() req, @Query() query: CustomMetricsQueryDto) {
    // Normalize metrics to array and filter out undefined/null values
    let metricIds: string[] = [];
    if (query.metrics) {
      metricIds = Array.isArray(query.metrics)
        ? query.metrics.filter(id => id && id !== 'undefined' && id !== 'null')
        : [query.metrics].filter(id => id && id !== 'undefined' && id !== 'null');
    }

    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;

    const data = await this.analyticsService.getCustomMetrics(
      req.user.tenantId,
      metricIds,
      fromDate,
      toDate,
    );

    return { success: true, data };
  }

  /**
   * Get all saved analytics views for the tenant (Phase 3)
   */
  @Get("saved-views")
  @Permissions("reports_read")
  async getSavedViews(@Req() req) {
    const views = await this.analyticsService.getSavedViews(req.user.tenantId);
    return { success: true, data: views };
  }

  /**
   * Get analytics templates for the tenant's vertical (Phase 3)
   */
  @Get("saved-views/templates")
  @Permissions("reports_read")
  async getTemplates(@Req() req) {
    const templates = await this.analyticsService.getTemplates(
      req.user.tenantId,
    );
    return { success: true, data: templates };
  }

  /**
   * Get a specific saved view by ID (Phase 3)
   */
  @Get("saved-views/:id")
  @Permissions("reports_read")
  async getSavedView(@Req() req, @Param("id") id: string) {
    const view = await this.analyticsService.getSavedView(
      req.user.tenantId,
      id,
    );
    return { success: true, data: view };
  }

  /**
   * Create a new saved analytics view (Phase 3)
   */
  @Post("saved-views")
  @Permissions("reports_read")
  async createSavedView(@Req() req, @Body() body: CreateSavedViewDto) {
    const view = await this.analyticsService.createSavedView(
      req.user.tenantId,
      req.user.userId,
      body,
    );
    return { success: true, data: view };
  }

  /**
   * Update a saved analytics view (Phase 3)
   */
  @Patch("saved-views/:id")
  @Permissions("reports_read")
  async updateSavedView(
    @Req() req,
    @Param("id") id: string,
    @Body() body: UpdateSavedViewDto,
  ) {
    const view = await this.analyticsService.updateSavedView(
      req.user.tenantId,
      id,
      body,
    );
    return { success: true, data: view };
  }

  /**
   * Delete a saved analytics view (Phase 3)
   */
  @Delete("saved-views/:id")
  @Permissions("reports_read")
  async deleteSavedView(@Req() req, @Param("id") id: string) {
    const result = await this.analyticsService.deleteSavedView(
      req.user.tenantId,
      id,
    );
    return result;
  }

  @Get("financial-kpis/compare")
  @Permissions("reports_read")
  async compareFinancialKpis(
    @Req() req,
    @Query() query: KpiCompareQueryDto,
  ) {
    const data = await this.analyticsService.compareFinancialKpiRanges(
      req.user.tenantId,
      new Date(query.fromA),
      new Date(query.toA),
      new Date(query.fromB),
      new Date(query.toB),
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

  @Get("expense-income-breakdown")
  @Permissions("reports_read")
  async getExpenseIncomeBreakdown(
    @Req() req,
    @Query() query: ExpenseIncomeBreakdownQueryDto,
  ) {
    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;
    const data = await this.analyticsService.getExpenseIncomeBreakdown(
      req.user.tenantId,
      query.period,
      query.granularity || "month",
      query.compare === "true",
      query.groupBy || "type",
      fromDate,
      toDate,
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
