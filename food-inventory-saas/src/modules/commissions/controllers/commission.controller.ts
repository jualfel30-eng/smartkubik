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
import { CommissionService } from "../services/commission.service";
import {
  CreateCommissionPlanDto,
  UpdateCommissionPlanDto,
  AssignCommissionPlanDto,
  UpdateEmployeeCommissionConfigDto,
  CommissionRecordFilterDto,
  ApproveCommissionDto,
  RejectCommissionDto,
  BulkApproveCommissionsDto,
} from "../../../dto/commissions.dto";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { TenantGuard } from "../../../guards/tenant.guard";
import { PermissionsGuard } from "../../../guards/permissions.guard";
import { Permissions } from "../../../decorators/permissions.decorator";

@Controller("commissions")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  // ════════════════════════════════════════════════════════════════════════════
  // COMMISSION PLANS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /commissions/plans
   * Crear un nuevo plan de comisión
   */
  @Post("plans")
  @Permissions("commissions_write")
  async createPlan(@Body() dto: CreateCommissionPlanDto, @Req() req) {
    return this.commissionService.createCommissionPlan(
      dto,
      req.user.tenantId,
      req.user._id,
    );
  }

  /**
   * GET /commissions/plans
   * Obtener todos los planes de comisión
   */
  @Get("plans")
  @Permissions("commissions_read")
  async findAllPlans(
    @Query("includeInactive") includeInactive: string,
    @Req() req,
  ) {
    return this.commissionService.findAllCommissionPlans(
      req.user.tenantId,
      includeInactive === "true",
    );
  }

  /**
   * GET /commissions/plans/default
   * Obtener el plan de comisión por defecto
   */
  @Get("plans/default")
  @Permissions("commissions_read")
  async findDefaultPlan(@Req() req) {
    return this.commissionService.findDefaultPlan(req.user.tenantId);
  }

  /**
   * GET /commissions/plans/:id
   * Obtener un plan de comisión por ID
   */
  @Get("plans/:id")
  @Permissions("commissions_read")
  async findPlanById(@Param("id") id: string, @Req() req) {
    return this.commissionService.findCommissionPlanById(id, req.user.tenantId);
  }

  /**
   * PUT /commissions/plans/:id
   * Actualizar un plan de comisión
   */
  @Put("plans/:id")
  @Permissions("commissions_write")
  async updatePlan(
    @Param("id") id: string,
    @Body() dto: UpdateCommissionPlanDto,
    @Req() req,
  ) {
    return this.commissionService.updateCommissionPlan(
      id,
      dto,
      req.user.tenantId,
      req.user._id,
    );
  }

  /**
   * DELETE /commissions/plans/:id
   * Eliminar un plan de comisión
   */
  @Delete("plans/:id")
  @Permissions("commissions_write")
  async deletePlan(@Param("id") id: string, @Req() req) {
    await this.commissionService.deleteCommissionPlan(id, req.user.tenantId);
    return { message: "Commission plan deleted successfully" };
  }

  /**
   * PATCH /commissions/plans/:id/set-default
   * Establecer un plan como el plan por defecto
   */
  @Patch("plans/:id/set-default")
  @Permissions("commissions_write")
  async setDefaultPlan(@Param("id") id: string, @Req() req) {
    return this.commissionService.setDefaultPlan(id, req.user.tenantId);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EMPLOYEE COMMISSION CONFIG
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /commissions/employees/:employeeId/assign
   * Asignar un plan de comisión a un empleado
   */
  @Post("employees/:employeeId/assign")
  @Permissions("commissions_write")
  async assignPlanToEmployee(
    @Param("employeeId") employeeId: string,
    @Body() dto: AssignCommissionPlanDto,
    @Req() req,
  ) {
    return this.commissionService.assignPlanToEmployee(
      employeeId,
      dto,
      req.user.tenantId,
      req.user._id,
    );
  }

  /**
   * GET /commissions/employees/:employeeId/config
   * Obtener la configuración de comisión de un empleado
   */
  @Get("employees/:employeeId/config")
  @Permissions("commissions_read")
  async getEmployeeConfig(@Param("employeeId") employeeId: string, @Req() req) {
    return this.commissionService.getEmployeeCommissionConfig(
      employeeId,
      req.user.tenantId,
    );
  }

  /**
   * PUT /commissions/employees/config/:configId
   * Actualizar la configuración de comisión de un empleado
   */
  @Put("employees/config/:configId")
  @Permissions("commissions_write")
  async updateEmployeeConfig(
    @Param("configId") configId: string,
    @Body() dto: UpdateEmployeeCommissionConfigDto,
    @Req() req,
  ) {
    return this.commissionService.updateEmployeeCommissionConfig(
      configId,
      dto,
      req.user.tenantId,
      req.user._id,
    );
  }

  /**
   * DELETE /commissions/employees/:employeeId/remove
   * Remover un empleado de su plan de comisión
   */
  @Delete("employees/:employeeId/remove")
  @Permissions("commissions_write")
  async removeEmployeeFromPlan(
    @Param("employeeId") employeeId: string,
    @Req() req,
  ) {
    await this.commissionService.removeEmployeeFromPlan(
      employeeId,
      req.user.tenantId,
    );
    return { message: "Employee removed from commission plan" };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // COMMISSION RECORDS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /commissions/calculate/:orderId
   * Calcular comisión para una orden específica
   */
  @Post("calculate/:orderId")
  @Permissions("commissions_write")
  async calculateCommission(@Param("orderId") orderId: string, @Req() req) {
    return this.commissionService.calculateCommission(orderId, req.user.tenantId);
  }

  /**
   * GET /commissions/records
   * Obtener registros de comisión con filtros
   */
  @Get("records")
  @Permissions("commissions_read")
  async getCommissionRecords(
    @Query() filters: CommissionRecordFilterDto,
    @Req() req,
  ) {
    return this.commissionService.getCommissionRecords(filters, req.user.tenantId);
  }

  /**
   * GET /commissions/records/pending
   * Obtener comisiones pendientes de aprobación
   */
  @Get("records/pending")
  @Permissions("commissions_read")
  async getPendingCommissions(@Req() req) {
    return this.commissionService.getPendingCommissions(req.user.tenantId);
  }

  /**
   * PATCH /commissions/records/:id/approve
   * Aprobar una comisión
   */
  @Patch("records/:id/approve")
  @Permissions("commissions_approve")
  async approveCommission(
    @Param("id") id: string,
    @Body() dto: ApproveCommissionDto,
    @Req() req,
  ) {
    return this.commissionService.approveCommission(
      id,
      req.user.tenantId,
      req.user._id,
      dto.notes,
    );
  }

  /**
   * PATCH /commissions/records/:id/reject
   * Rechazar una comisión
   */
  @Patch("records/:id/reject")
  @Permissions("commissions_approve")
  async rejectCommission(
    @Param("id") id: string,
    @Body() dto: RejectCommissionDto,
    @Req() req,
  ) {
    return this.commissionService.rejectCommission(
      id,
      dto.reason,
      req.user.tenantId,
      req.user._id,
      dto.notes,
    );
  }

  /**
   * POST /commissions/records/bulk-approve
   * Aprobar múltiples comisiones
   */
  @Post("records/bulk-approve")
  @Permissions("commissions_approve")
  async bulkApproveCommissions(@Body() dto: BulkApproveCommissionsDto, @Req() req) {
    return this.commissionService.bulkApproveCommissions(
      dto.commissionRecordIds,
      req.user.tenantId,
      req.user._id,
      dto.notes,
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /commissions/reports/employee/:employeeId
   * Obtener resumen de comisiones de un empleado
   */
  @Get("reports/employee/:employeeId")
  @Permissions("commissions_read", "reports_read")
  async getEmployeeCommissionsSummary(
    @Param("employeeId") employeeId: string,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Req() req,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.commissionService.getEmployeeCommissionsSummary(
      employeeId,
      start,
      end,
      req.user.tenantId,
    );
  }

  /**
   * GET /commissions/reports/summary
   * Obtener resumen consolidado de comisiones
   */
  @Get("reports/summary")
  @Permissions("commissions_read", "reports_read")
  async getCommissionsSummary(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Req() req,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.commissionService.getCommissionsSummary(
      start,
      end,
      req.user.tenantId,
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAYROLL INTEGRATION
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /commissions/payroll/approved/:employeeId
   * Obtener comisiones aprobadas para nómina de un empleado
   */
  @Get("payroll/approved/:employeeId")
  @Permissions("commissions_read", "payroll_read")
  async getApprovedCommissionsForPayroll(
    @Param("employeeId") employeeId: string,
    @Query("periodStart") periodStart: string,
    @Query("periodEnd") periodEnd: string,
    @Req() req,
  ) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    return this.commissionService.getApprovedCommissions(
      employeeId,
      start,
      end,
      req.user.tenantId,
    );
  }

  /**
   * POST /commissions/payroll/mark-paid
   * Marcar comisiones como pagadas (llamado desde nómina)
   */
  @Post("payroll/mark-paid")
  @Permissions("commissions_write", "payroll_write")
  async markCommissionsAsPaid(
    @Body() body: { recordIds: string[]; payrollRunId: string },
    @Req() req,
  ) {
    const count = await this.commissionService.markAsPaid(
      body.recordIds,
      body.payrollRunId,
      req.user.tenantId,
    );
    return { markedAsPaid: count };
  }
}
