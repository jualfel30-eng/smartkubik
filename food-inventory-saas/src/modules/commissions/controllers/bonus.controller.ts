import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request as Req,
  Patch,
} from "@nestjs/common";
import { BonusService } from "../services/bonus.service";
import {
  CreateManualBonusDto,
  BonusFilterDto,
  ApproveBonusDto,
  RejectBonusDto,
  CancelBonusDto,
} from "../../../dto/commissions.dto";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { TenantGuard } from "../../../guards/tenant.guard";
import { PermissionsGuard } from "../../../guards/permissions.guard";
import { Permissions } from "../../../decorators/permissions.decorator";

@Controller("bonuses")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class BonusController {
  constructor(private readonly bonusService: BonusService) {}

  // ════════════════════════════════════════════════════════════════════════════
  // BONUS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /bonuses
   * Crear un bono manual
   */
  @Post()
  @Permissions("bonuses_write")
  async createManualBonus(@Body() dto: CreateManualBonusDto, @Req() req) {
    return this.bonusService.createManualBonus(
      dto,
      req.user.tenantId,
      req.user._id,
    );
  }

  /**
   * GET /bonuses
   * Obtener bonos con filtros
   */
  @Get()
  @Permissions("bonuses_read")
  async getBonuses(@Query() filters: BonusFilterDto, @Req() req) {
    return this.bonusService.getBonuses(filters, req.user.tenantId);
  }

  /**
   * GET /bonuses/pending
   * Obtener bonos pendientes de aprobación
   */
  @Get("pending")
  @Permissions("bonuses_read")
  async getPendingBonuses(@Req() req) {
    return this.bonusService.getPendingBonuses(req.user.tenantId);
  }

  /**
   * GET /bonuses/:id
   * Obtener un bono por ID
   */
  @Get(":id")
  @Permissions("bonuses_read")
  async getBonusById(@Param("id") id: string, @Req() req) {
    return this.bonusService.getBonusById(id, req.user.tenantId);
  }

  /**
   * PUT /bonuses/:id
   * Actualizar un bono manual (solo si está pendiente)
   */
  @Put(":id")
  @Permissions("bonuses_write")
  async updateBonus(
    @Param("id") id: string,
    @Body() dto: Partial<CreateManualBonusDto>,
    @Req() req,
  ) {
    return this.bonusService.updateManualBonus(
      id,
      dto,
      req.user.tenantId,
      req.user._id,
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BONUS APPROVAL WORKFLOW
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * PATCH /bonuses/:id/approve
   * Aprobar un bono
   */
  @Patch(":id/approve")
  @Permissions("bonuses_approve")
  async approveBonus(
    @Param("id") id: string,
    @Body() dto: ApproveBonusDto,
    @Req() req,
  ) {
    return this.bonusService.approveBonus(
      id,
      req.user.tenantId,
      req.user._id,
      dto.notes,
    );
  }

  /**
   * PATCH /bonuses/:id/reject
   * Rechazar un bono
   */
  @Patch(":id/reject")
  @Permissions("bonuses_approve")
  async rejectBonus(
    @Param("id") id: string,
    @Body() dto: RejectBonusDto,
    @Req() req,
  ) {
    return this.bonusService.rejectBonus(
      id,
      dto.reason,
      req.user.tenantId,
      req.user._id,
      dto.notes,
    );
  }

  /**
   * PATCH /bonuses/:id/cancel
   * Cancelar un bono (antes de ser pagado)
   */
  @Patch(":id/cancel")
  @Permissions("bonuses_write")
  async cancelBonus(
    @Param("id") id: string,
    @Body() dto: CancelBonusDto,
    @Req() req,
  ) {
    return this.bonusService.cancelBonus(
      id,
      dto.reason,
      req.user.tenantId,
      req.user._id,
    );
  }

  /**
   * POST /bonuses/bulk-approve
   * Aprobar múltiples bonos
   */
  @Post("bulk-approve")
  @Permissions("bonuses_approve")
  async bulkApproveBonuses(
    @Body() body: { bonusIds: string[]; notes?: string },
    @Req() req,
  ) {
    return this.bonusService.bulkApproveBonuses(
      body.bonusIds,
      req.user.tenantId,
      req.user._id,
      body.notes,
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GOAL ACHIEVEMENT BONUS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /bonuses/award-goal/:goalProgressId
   * Otorgar bono por logro de meta (manualmente)
   */
  @Post("award-goal/:goalProgressId")
  @Permissions("bonuses_write")
  async awardGoalBonus(
    @Param("goalProgressId") goalProgressId: string,
    @Req() req,
  ) {
    return this.bonusService.awardGoalBonus(
      goalProgressId,
      req.user.tenantId,
      req.user._id,
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAYROLL INTEGRATION
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /bonuses/payroll/approved/:employeeId
   * Obtener bonos aprobados para nómina de un empleado
   */
  @Get("payroll/approved/:employeeId")
  @Permissions("bonuses_read", "payroll_read")
  async getApprovedBonusesForPayroll(
    @Param("employeeId") employeeId: string,
    @Query("periodStart") periodStart: string,
    @Query("periodEnd") periodEnd: string,
    @Req() req,
  ) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    return this.bonusService.getApprovedBonuses(
      employeeId,
      start,
      end,
      req.user.tenantId,
    );
  }

  /**
   * GET /bonuses/payroll/all-approved
   * Obtener todos los bonos aprobados pendientes de pago
   */
  @Get("payroll/all-approved")
  @Permissions("bonuses_read", "payroll_read")
  async getAllApprovedBonusesForPayroll(
    @Query("periodStart") periodStart: string,
    @Query("periodEnd") periodEnd: string,
    @Req() req,
  ) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    return this.bonusService.getAllApprovedBonusesForPayroll(
      start,
      end,
      req.user.tenantId,
    );
  }

  /**
   * POST /bonuses/payroll/mark-paid
   * Marcar bonos como pagados (llamado desde nómina)
   */
  @Post("payroll/mark-paid")
  @Permissions("bonuses_write", "payroll_write")
  async markBonusesAsPaid(
    @Body()
    body: {
      bonusIds: string[];
      payrollRunId: string;
      payrollPeriodLabel: string;
    },
    @Req() req,
  ) {
    const count = await this.bonusService.markAsPaid(
      body.bonusIds,
      body.payrollRunId,
      body.payrollPeriodLabel,
      req.user.tenantId,
    );
    return { markedAsPaid: count };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /bonuses/reports/employee/:employeeId
   * Obtener resumen de bonos de un empleado
   */
  @Get("reports/employee/:employeeId")
  @Permissions("bonuses_read", "reports_read")
  async getEmployeeBonusSummary(
    @Param("employeeId") employeeId: string,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Req() req,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.bonusService.getEmployeeBonusSummary(
      employeeId,
      start,
      end,
      req.user.tenantId,
    );
  }

  /**
   * GET /bonuses/reports/summary
   * Obtener resumen consolidado de bonos
   */
  @Get("reports/summary")
  @Permissions("bonuses_read", "reports_read")
  async getBonusesSummary(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Req() req,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.bonusService.getBonusesSummary(start, end, req.user.tenantId);
  }

  /**
   * GET /bonuses/reports/goals
   * Obtener estadísticas de bonos de metas
   */
  @Get("reports/goals")
  @Permissions("bonuses_read", "reports_read")
  async getGoalBonusStats(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Req() req,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.bonusService.getGoalBonusStats(start, end, req.user.tenantId);
  }
}
