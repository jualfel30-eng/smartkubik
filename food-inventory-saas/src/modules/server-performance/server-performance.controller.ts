import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request as Req,
} from "@nestjs/common";
import { ServerPerformanceService } from "./server-performance.service";
import {
  CreateServerPerformanceDto,
  UpdateServerPerformanceDto,
  ServerPerformanceQueryDto,
  SetServerGoalsDto,
} from "../../dto/server-performance.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@Controller("server-performance")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ServerPerformanceController {
  constructor(
    private readonly serverPerformanceService: ServerPerformanceService,
  ) {}

  // ========== CRUD ==========

  /**
   * POST /server-performance
   * Crear nuevo registro de performance
   */
  @Post()
  @Permissions("restaurant_write")
  async create(@Body() dto: CreateServerPerformanceDto, @Req() req) {
    return this.serverPerformanceService.create(dto, req.user.tenantId);
  }

  /**
   * GET /server-performance
   * Obtener todos los registros con filtros
   */
  @Get()
  @Permissions("restaurant_read")
  async findAll(@Query() query: ServerPerformanceQueryDto, @Req() req) {
    return this.serverPerformanceService.findAll(query, req.user.tenantId);
  }

  /**
   * GET /server-performance/:id
   * Obtener un registro específico
   */
  @Get(":id")
  @Permissions("restaurant_read")
  async findOne(@Param("id") id: string, @Req() req) {
    return this.serverPerformanceService.findOne(id, req.user.tenantId);
  }

  /**
   * PATCH /server-performance/:id
   * Actualizar un registro
   */
  @Patch(":id")
  @Permissions("restaurant_write")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateServerPerformanceDto,
    @Req() req,
  ) {
    return this.serverPerformanceService.update(id, dto, req.user.tenantId);
  }

  /**
   * DELETE /server-performance/:id
   * Eliminar registro (soft delete)
   */
  @Delete(":id")
  @Permissions("restaurant_write")
  async remove(@Param("id") id: string, @Req() req) {
    await this.serverPerformanceService.remove(id, req.user.tenantId);
    return { message: "Performance record removed successfully" };
  }

  // ========== AUTO-CALCULATE ==========

  /**
   * POST /server-performance/calculate/:serverId
   * Auto-calcular performance desde órdenes
   */
  @Post("calculate/:serverId")
  @Permissions("restaurant_write")
  async calculateFromOrders(
    @Param("serverId") serverId: string,
    @Query("date") date: string,
    @Req() req,
  ) {
    const calculationDate = date || new Date().toISOString().split("T")[0];
    return this.serverPerformanceService.calculatePerformanceFromOrders(
      serverId,
      calculationDate,
      req.user.tenantId,
    );
  }

  // ========== ANALYTICS ==========

  /**
   * GET /server-performance/analytics/overview
   * Obtener analytics completo
   */
  @Get("analytics/overview")
  @Permissions("restaurant_read")
  async getAnalytics(@Query() query: ServerPerformanceQueryDto, @Req() req) {
    return this.serverPerformanceService.getAnalytics(query, req.user.tenantId);
  }

  /**
   * GET /server-performance/analytics/comparison
   * Comparar performance entre servidores
   */
  @Get("analytics/comparison")
  @Permissions("restaurant_read")
  async getComparison(@Query() query: ServerPerformanceQueryDto, @Req() req) {
    return this.serverPerformanceService.getComparison(
      query,
      req.user.tenantId,
    );
  }

  /**
   * GET /server-performance/analytics/leaderboard
   * Obtener tabla de clasificación
   */
  @Get("analytics/leaderboard")
  @Permissions("restaurant_read")
  async getLeaderboard(@Query() query: ServerPerformanceQueryDto, @Req() req) {
    return this.serverPerformanceService.getLeaderboard(
      query,
      req.user.tenantId,
    );
  }

  // ========== GOALS ==========

  /**
   * POST /server-performance/goals
   * Establecer metas para un servidor
   */
  @Post("goals")
  @Permissions("restaurant_write")
  async setGoals(@Body() dto: SetServerGoalsDto, @Req() req) {
    return this.serverPerformanceService.setGoals(dto, req.user.tenantId);
  }
}
