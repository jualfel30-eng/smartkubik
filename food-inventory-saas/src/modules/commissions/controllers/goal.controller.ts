import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request as Req,
  Patch,
} from "@nestjs/common";
import { GoalService } from "../services/goal.service";
import {
  CreateSalesGoalDto,
  UpdateSalesGoalDto,
  SalesGoalFilterDto,
  GoalProgressFilterDto,
} from "../../../dto/commissions.dto";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { TenantGuard } from "../../../guards/tenant.guard";
import { PermissionsGuard } from "../../../guards/permissions.guard";
import { Permissions } from "../../../decorators/permissions.decorator";

@Controller("goals")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  // ════════════════════════════════════════════════════════════════════════════
  // SALES GOALS CRUD
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /goals
   * Crear una nueva meta de ventas
   */
  @Post()
  @Permissions("goals_write")
  async createGoal(@Body() dto: CreateSalesGoalDto, @Req() req) {
    return this.goalService.createSalesGoal(
      dto,
      req.user.tenantId,
      req.user._id,
    );
  }

  /**
   * GET /goals
   * Obtener todas las metas con filtros
   */
  @Get()
  @Permissions("goals_read")
  async findAllGoals(@Query() filters: SalesGoalFilterDto, @Req() req) {
    return this.goalService.findAllSalesGoals(filters, req.user.tenantId);
  }

  /**
   * GET /goals/active
   * Obtener solo las metas activas
   */
  @Get("active")
  @Permissions("goals_read")
  async findActiveGoals(@Req() req) {
    return this.goalService.findActiveSalesGoals(req.user.tenantId);
  }

  /**
   * GET /goals/:id
   * Obtener una meta por ID
   */
  @Get(":id")
  @Permissions("goals_read")
  async findGoalById(@Param("id") id: string, @Req() req) {
    return this.goalService.findSalesGoalById(id, req.user.tenantId);
  }

  /**
   * PUT /goals/:id
   * Actualizar una meta
   */
  @Put(":id")
  @Permissions("goals_write")
  async updateGoal(
    @Param("id") id: string,
    @Body() dto: UpdateSalesGoalDto,
    @Req() req,
  ) {
    return this.goalService.updateSalesGoal(
      id,
      dto,
      req.user.tenantId,
      req.user._id,
    );
  }

  /**
   * DELETE /goals/:id
   * Eliminar una meta (solo si no tiene progreso)
   */
  @Delete(":id")
  @Permissions("goals_write")
  async deleteGoal(@Param("id") id: string, @Req() req) {
    await this.goalService.deleteSalesGoal(id, req.user.tenantId);
    return { message: "Sales goal deleted successfully" };
  }

  /**
   * PATCH /goals/:id/activate
   * Activar una meta
   */
  @Patch(":id/activate")
  @Permissions("goals_write")
  async activateGoal(@Param("id") id: string, @Req() req) {
    return this.goalService.activateSalesGoal(id, req.user.tenantId);
  }

  /**
   * PATCH /goals/:id/deactivate
   * Desactivar una meta
   */
  @Patch(":id/deactivate")
  @Permissions("goals_write")
  async deactivateGoal(@Param("id") id: string, @Req() req) {
    return this.goalService.deactivateSalesGoal(id, req.user.tenantId);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GOAL PROGRESS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /goals/:goalId/progress
   * Obtener progreso de una meta específica
   */
  @Get(":goalId/progress")
  @Permissions("goals_read")
  async getGoalProgress(
    @Param("goalId") goalId: string,
    @Query() filters: GoalProgressFilterDto,
    @Req() req,
  ) {
    return this.goalService.getGoalProgress(
      { ...filters, goalId },
      req.user.tenantId,
    );
  }

  /**
   * GET /goals/progress/all
   * Obtener todos los progresos con filtros
   */
  @Get("progress/all")
  @Permissions("goals_read")
  async getAllProgress(@Query() filters: GoalProgressFilterDto, @Req() req) {
    return this.goalService.getGoalProgress(filters, req.user.tenantId);
  }

  /**
   * GET /goals/employee/:employeeId/progress
   * Obtener progreso de metas de un empleado
   */
  @Get("employee/:employeeId/progress")
  @Permissions("goals_read")
  async getEmployeeGoalProgress(
    @Param("employeeId") employeeId: string,
    @Query("periodStart") periodStart: string,
    @Query("periodEnd") periodEnd: string,
    @Req() req,
  ) {
    const filters: GoalProgressFilterDto = { employeeId };
    if (periodStart) filters.periodStart = periodStart;
    if (periodEnd) filters.periodEnd = periodEnd;

    return this.goalService.getGoalProgress(filters, req.user.tenantId);
  }

  /**
   * GET /goals/employee/:employeeId/applicable
   * Obtener metas aplicables a un empleado
   */
  @Get("employee/:employeeId/applicable")
  @Permissions("goals_read")
  async getApplicableGoalsForEmployee(
    @Param("employeeId") employeeId: string,
    @Req() req,
  ) {
    return this.goalService.getApplicableGoalsForEmployee(
      employeeId,
      req.user.tenantId,
    );
  }

  /**
   * POST /goals/:goalId/initialize-progress
   * Inicializar progreso de una meta para todos los empleados elegibles
   */
  @Post(":goalId/initialize-progress")
  @Permissions("goals_write")
  async initializeProgress(@Param("goalId") goalId: string, @Req() req) {
    return this.goalService.initializeProgressForGoal(goalId, req.user.tenantId);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DASHBOARD & REPORTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /goals/dashboard
   * Obtener dashboard de metas
   */
  @Get("reports/dashboard")
  @Permissions("goals_read", "reports_read")
  async getGoalsDashboard(
    @Query("periodStart") periodStart: string,
    @Query("periodEnd") periodEnd: string,
    @Req() req,
  ) {
    const start = periodStart
      ? new Date(periodStart)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = periodEnd ? new Date(periodEnd) : new Date();

    return this.goalService.getGoalsDashboard(req.user.tenantId, start, end);
  }

  /**
   * GET /goals/reports/employee/:employeeId
   * Obtener reporte de metas de un empleado
   */
  @Get("reports/employee/:employeeId")
  @Permissions("goals_read", "reports_read")
  async getEmployeeGoalsReport(
    @Param("employeeId") employeeId: string,
    @Query("periodStart") periodStart: string,
    @Query("periodEnd") periodEnd: string,
    @Req() req,
  ) {
    const start = periodStart
      ? new Date(periodStart)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = periodEnd ? new Date(periodEnd) : new Date();

    return this.goalService.getEmployeeGoalsReport(
      employeeId,
      start,
      end,
      req.user.tenantId,
    );
  }

  /**
   * GET /goals/reports/team
   * Obtener reporte de equipo (ranking)
   */
  @Get("reports/team")
  @Permissions("goals_read", "reports_read")
  async getTeamGoalsReport(
    @Query("goalId") goalId: string,
    @Query("periodStart") periodStart: string,
    @Query("periodEnd") periodEnd: string,
    @Req() req,
  ) {
    const start = periodStart
      ? new Date(periodStart)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = periodEnd ? new Date(periodEnd) : new Date();

    return this.goalService.getTeamGoalsReport(
      goalId,
      start,
      end,
      req.user.tenantId,
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PERIOD MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /goals/close-period
   * Cerrar período y procesar logros
   */
  @Post("close-period")
  @Permissions("goals_write")
  async closePeriod(
    @Body() body: { periodEnd: string },
    @Req() req,
  ) {
    return this.goalService.closePeriodAndProcessAchievements(
      new Date(body.periodEnd),
      req.user.tenantId,
    );
  }

  /**
   * POST /goals/:goalId/recalculate
   * Recalcular progreso de una meta (para correcciones)
   */
  @Post(":goalId/recalculate")
  @Permissions("goals_write")
  async recalculateGoalProgress(@Param("goalId") goalId: string, @Req() req) {
    return this.goalService.recalculateGoalProgress(goalId, req.user.tenantId);
  }
}
