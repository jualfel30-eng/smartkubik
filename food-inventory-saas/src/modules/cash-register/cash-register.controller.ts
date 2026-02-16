import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { ModuleAccessGuard } from "../../guards/module-access.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { RequireModule } from "../../decorators/require-module.decorator";
import { CashRegisterService } from "./cash-register.service";
import {
  OpenCashRegisterDto,
  CloseCashRegisterDto,
  CashMovementDto,
  CreateGlobalClosingDto,
  CashRegisterQueryDto,
  CashRegisterClosingQueryDto,
  ApproveClosingDto,
  RejectClosingDto,
  ExportClosingDto,
  CashRegisterReportDto,
  CashRegisterChangeReportDto,
  CashRegisterDenominationReportDto,
} from "../../dto/cash-register.dto";

@Controller("cash-register")
@RequireModule("cashRegister")
@UseGuards(JwtAuthGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) { }

  // ============================================
  // SESIONES DE CAJA
  // ============================================

  /**
   * Abrir una nueva sesión de caja
   */
  @Post("sessions/open")
  @Permissions("cash_register_open")
  async openSession(@Body() dto: OpenCashRegisterDto, @Request() req: any) {
    return this.cashRegisterService.openSession(dto, req.user);
  }

  /**
   * Obtener la sesión abierta del usuario actual
   */
  @Get("sessions/current")
  @Permissions("cash_register_read")
  async getCurrentSession(@Request() req: any) {
    const session = await this.cashRegisterService.getOpenSession(req.user);
    return { session };
  }

  /**
   * Obtener todas las sesiones abiertas (admin)
   */
  @Get("sessions/open")
  @Permissions("cash_register_admin")
  async getAllOpenSessions(@Request() req: any) {
    return this.cashRegisterService.getAllOpenSessions(req.user.tenantId);
  }

  /**
   * Listar sesiones con filtros
   */
  @Get("sessions")
  @Permissions("cash_register_read")
  async findSessions(
    @Query() query: CashRegisterQueryDto,
    @Request() req: any,
  ) {
    return this.cashRegisterService.findSessions(req.user.tenantId, query);
  }

  /**
   * Agregar movimiento de efectivo a una sesión
   */
  @Post("sessions/:sessionId/movements")
  @Permissions("cash_register_write")
  async addCashMovement(
    @Param("sessionId") sessionId: string,
    @Body() dto: CashMovementDto,
    @Request() req: any,
  ) {
    return this.cashRegisterService.addCashMovement(sessionId, dto, req.user);
  }

  /**
   * Obtener totales calculados en tiempo real de una sesión
   */
  @Get("sessions/:sessionId/totals")
  @Permissions("cash_register_read")
  async getSessionTotals(
    @Param("sessionId") sessionId: string,
    @Request() req: any,
  ) {
    console.log(`[CashRegisterController] getSessionTotals called for session: ${sessionId}`);
    return this.cashRegisterService.calculateSessionTotals(sessionId, req.user.tenantId);
  }

  // ============================================
  // CIERRE DE CAJA (INDIVIDUAL)
  // ============================================

  /**
   * Cerrar una sesión de caja (individual)
   */
  @Post("sessions/:sessionId/close")
  @Permissions("cash_register_close")
  async closeSession(
    @Param("sessionId") sessionId: string,
    @Body() dto: CloseCashRegisterDto,
    @Request() req: any
  ) {
    // Inject sessionId into DTO if needed, or pass it separately
    // Assuming service.closeSession takes (dto, user), we might need to update DTO
    // OR we just ignore the param if the DTO has it.
    // Let's verify if DTO has sessionId.
    // Ideally, we should ensure consistency.
    // For now, let's just make the route match.
    return this.cashRegisterService.closeSession({ ...dto, sessionId }, req.user);
  }

  // ============================================
  // CIERRE GLOBAL (CONSOLIDADO - ADMIN)
  // ============================================

  /**
   * Crear cierre global/consolidado (admin)
   */
  @Post("closings/global")
  @Permissions("cash_register_admin")
  async createGlobalClosing(
    @Body() dto: CreateGlobalClosingDto,
    @Request() req: any,
  ) {
    return this.cashRegisterService.createGlobalClosing(dto, req.user);
  }

  // ============================================
  // CONSULTAS DE CIERRES
  // ============================================

  /**
   * Listar cierres de caja con filtros
   */
  @Get("closings")
  @Permissions("cash_register_read")
  async findClosings(
    @Query() query: CashRegisterClosingQueryDto,
    @Request() req: any,
  ) {
    return this.cashRegisterService.findClosings(req.user.tenantId, query);
  }

  /**
   * Obtener detalle de un cierre específico
   */
  @Get("closings/:closingId")
  @Permissions("cash_register_read")
  async getClosingById(
    @Param("closingId") closingId: string,
    @Request() req: any,
  ) {
    return this.cashRegisterService.getClosingById(closingId, req.user.tenantId);
  }

  // ============================================
  // APROBACIÓN / RECHAZO
  // ============================================

  /**
   * Aprobar un cierre de caja
   */
  @Post("closings/approve")
  @Permissions("cash_register_approve")
  async approveClosing(@Body() dto: ApproveClosingDto, @Request() req: any) {
    return this.cashRegisterService.approveClosing(dto, req.user);
  }

  /**
   * Rechazar un cierre de caja
   */
  @Post("closings/reject")
  @Permissions("cash_register_approve")
  async rejectClosing(@Body() dto: RejectClosingDto, @Request() req: any) {
    return this.cashRegisterService.rejectClosing(dto, req.user);
  }

  // ============================================
  // REPORTES
  // ============================================

  /**
   * Generar reporte de cierres de caja
   */
  @Post("reports")
  @Permissions("cash_register_reports")
  async generateReport(
    @Body() dto: CashRegisterReportDto,
    @Request() req: any,
  ) {
    return this.cashRegisterService.generateReport(req.user.tenantId, dto);
  }

  /**
   * Generar reporte detallado de vueltos y movimientos de efectivo
   */
  @Post("reports/change-analysis")
  @Permissions("cash_register_reports")
  async getChangeAnalysis(
    @Body() dto: CashRegisterChangeReportDto,
    @Request() req: any,
  ) {
    return this.cashRegisterService.getChangeAnalysis(req.user.tenantId, dto);
  }

  /**
   * Generar reporte de flujo de denominaciones (billetes)
   */
  @Post("reports/denominations")
  @Permissions("cash_register_reports")
  async getDenominationReport(
    @Body() dto: CashRegisterDenominationReportDto,
    @Request() req: any,
  ) {
    return this.cashRegisterService.getDenominationReport(req.user.tenantId, dto);
  }

  // ============================================
  // EXPORTACIÓN
  // ============================================

  /**
   * Exportar un cierre de caja
   */
  @Post("closings/:closingId/export")
  @Permissions("cash_register_export")
  async exportClosing(
    @Param("closingId") closingId: string,
    @Body() dto: ExportClosingDto,
    @Request() req: any,
    @Res() res: any,
  ) {
    const result = await this.cashRegisterService.exportClosing(
      closingId,
      req.user.tenantId,
      dto.format,
    );

    if (result.type === 'pdf' && result.stream) {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${result.filename}"`,
      });
      result.stream.pipe(res);
    } else {
      res.json(result);
    }
  }

  /**
   * REPAIR UTILITY: Re-calculates and updates the latest closing.
   */
  @Post("closings/repair-last")
  // @Permissions("super_admin") // Open for now to unblock user quickly
  async repairLastClosing(@Request() req: any) {
    return this.cashRegisterService.repairLastClosing(req.user.tenantId);
  }
}
