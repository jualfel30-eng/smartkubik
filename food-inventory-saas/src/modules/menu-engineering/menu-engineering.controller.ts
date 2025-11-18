import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { MenuEngineeringService } from "./menu-engineering.service";
import {
  MenuEngineeringQueryDto,
  ForecastingQueryDto,
  PriceOptimizationQueryDto,
} from "../../dto/menu-engineering.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@Controller("menu-engineering")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class MenuEngineeringController {
  constructor(
    private readonly menuEngineeringService: MenuEngineeringService,
  ) {}

  /**
   * GET /menu-engineering
   * Análisis BCG Matrix estándar
   */
  @Get()
  @Permissions("restaurant_read", "analytics_read")
  async analyze(@Query() query: MenuEngineeringQueryDto, @Req() req) {
    return this.menuEngineeringService.analyze(query, req.user.tenantId);
  }

  /**
   * GET /menu-engineering/forecast
   * Forecasting con IA - Predice demanda futura
   */
  @Get("forecast")
  @Permissions("restaurant_read", "analytics_read")
  async forecastDemand(@Query() query: ForecastingQueryDto, @Req() req) {
    return this.menuEngineeringService.forecastDemand(query, req.user.tenantId);
  }

  /**
   * GET /menu-engineering/price-optimization
   * Optimización de precios con IA
   */
  @Get("price-optimization")
  @Permissions("restaurant_write", "analytics_read")
  async optimizePrices(@Query() query: PriceOptimizationQueryDto, @Req() req) {
    return this.menuEngineeringService.optimizePrices(query, req.user.tenantId);
  }

  /**
   * GET /menu-engineering/smart-suggestions
   * Sugerencias inteligentes con IA
   */
  @Get("smart-suggestions")
  @Permissions("restaurant_read", "analytics_read")
  async smartSuggestions(@Req() req) {
    return this.menuEngineeringService.generateSmartSuggestions(
      req.user.tenantId,
    );
  }
}
