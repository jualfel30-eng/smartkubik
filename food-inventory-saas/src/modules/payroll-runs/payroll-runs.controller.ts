import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PayrollRunsService } from "./payroll-runs.service";
import { CreatePayrollConceptDto } from "./dto/create-payroll-concept.dto";
import { UpdatePayrollConceptDto } from "./dto/update-payroll-concept.dto";
import { CreatePayrollRunDto } from "./dto/create-payroll-run.dto";
import { PayrollRunFiltersDto } from "./dto/payroll-run-filters.dto";
import { ExportPayrollRunDto } from "./dto/export-payroll-run.dto";
import { PayrollConceptFiltersDto } from "./dto/payroll-concept-filters.dto";
import { UpdatePayrollRunStatusDto } from "./dto/update-payroll-run-status.dto";
import { AddPayrollAdjustmentDto } from "./dto/add-payroll-adjustment.dto";
import { PayPayrollRunDto } from "./dto/pay-payroll-run.dto";
import { RemapPayrollAccountsDto } from "./dto/remap-payroll-accounts.dto";
import { CreateSpecialPayrollRunDto } from "./dto/create-special-payroll-run.dto";
import { SpecialPayrollRunFiltersDto } from "./dto/special-payroll-run-filters.dto";
import { UpdateSpecialPayrollRunStatusDto } from "./dto/update-special-payroll-run-status.dto";
import { Response } from "express";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("payroll-runs")
@ApiBearerAuth()
@Controller("payroll")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class PayrollRunsController {
  constructor(private readonly payrollRunsService: PayrollRunsService) {}

  @Post("concepts")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Crear concepto de nómina" })
  async createConcept(@Req() req, @Body() dto: CreatePayrollConceptDto) {
    return this.payrollRunsService.createConcept(
      req.user.tenantId,
      dto,
      req.user.id,
    );
  }

  @Patch("concepts/:id")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Actualizar concepto" })
  async updateConcept(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: UpdatePayrollConceptDto,
  ) {
    return this.payrollRunsService.updateConcept(
      req.user.tenantId,
      id,
      dto,
      req.user.id,
    );
  }

  @Get("concepts")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Listar conceptos" })
  async listConcepts(@Req() req, @Query() filters: PayrollConceptFiltersDto) {
    return this.payrollRunsService.listConcepts(req.user.tenantId, filters);
  }

  @Get("runs")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Listar ejecuciones de nómina" })
  async listRuns(@Req() req, @Query() filters: PayrollRunFiltersDto) {
    return this.payrollRunsService.listRuns(req.user.tenantId, filters);
  }

  @Post("runs")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Crear / calcular una nómina" })
  async createRun(@Req() req, @Body() dto: CreatePayrollRunDto) {
    return this.payrollRunsService.createRun(
      req.user.tenantId,
      dto,
      req.user.id,
    );
  }

  @Get("runs/:id")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Detalle de una nómina" })
  async getRun(@Req() req, @Param("id") id: string) {
    return this.payrollRunsService.getRun(req.user.tenantId, id);
  }

  @Get("runs/:id/export")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Exportar nómina (CSV/PDF)" })
  async exportRun(
    @Req() req,
    @Param("id") id: string,
    @Query() query: ExportPayrollRunDto,
    @Res() res: Response,
  ) {
    const file = await this.payrollRunsService.exportRun(
      req.user.tenantId,
      id,
      query,
    );
    res
      .setHeader("Content-Type", file.contentType)
      .setHeader(
        "Content-Disposition",
        `attachment; filename=\"${file.filename}\"`,
      )
      .send(file.buffer);
  }

  @Get("runs/:id/payslips")
  @Permissions("payroll_employees_read")
  @ApiOperation({
    summary: "Descargar recibos individuales en PDF (paginados)",
  })
  async exportPayslips(
    @Req() req,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const file = await this.payrollRunsService.exportPayslips(
      req.user.tenantId,
      id,
    );
    res
      .setHeader("Content-Type", file.contentType)
      .setHeader(
        "Content-Disposition",
        `attachment; filename=\"${file.filename}\"`,
      )
      .send(file.buffer);
  }

  @Get("audit")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Bitácora de acciones de nómina" })
  async listAudit(
    @Req() req,
    @Query("entity") entity?: string,
    @Query("entityId") entityId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.payrollRunsService.listAuditLogs(req.user.tenantId, {
      entity,
      entityId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post("runs/:id/recalculate")
  @Permissions("payroll_employees_write")
  @ApiOperation({
    summary: "Recalcular nómina existente (solo si no está aprobada/pagada)",
  })
  async recalculate(@Req() req, @Param("id") id: string) {
    return this.payrollRunsService.recalculateRun(
      req.user.tenantId,
      id,
      req.user.id,
    );
  }

  @Patch("runs/:id/status")
  @Permissions("payroll_employees_write")
  @ApiOperation({
    summary: "Actualizar el estado de la nómina (approved/paid)",
  })
  async updateStatus(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: UpdatePayrollRunStatusDto,
  ) {
    return this.payrollRunsService.updateRunStatus(
      req.user.tenantId,
      id,
      dto.status,
      req.user.id,
    );
  }

  @Post("runs/:id/pay")
  @Permissions("payroll_employees_write")
  @ApiOperation({
    summary: "Pagar nómina aprobada (crea pagos sobre payables)",
  })
  async payRun(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: PayPayrollRunDto,
  ) {
    return this.payrollRunsService.payRun(
      req.user.tenantId,
      id,
      dto,
      req.user.id,
    );
  }

  @Get("runs/:id/bank-file")
  @Permissions("payroll_employees_read")
  @ApiOperation({
    summary: "Generar archivo bancario (TXT/CSV) para payables de la nómina",
  })
  async exportBankFile(
    @Req() req,
    @Param("id") id: string,
    @Query("bank") bank: string,
    @Query("format") format: string,
    @Query("bankAccountId") bankAccountId: string,
    @Res() res: Response,
  ) {
    const file = await this.payrollRunsService.exportBankFile(
      req.user.tenantId,
      id,
      bank || "generic",
      format || "csv",
      bankAccountId,
    );
    res
      .setHeader("Content-Type", file.contentType)
      .setHeader(
        "Content-Disposition",
        `attachment; filename=\"${file.filename}\"`,
      )
      .send(file.buffer);
  }

  @Get("runs/:id/accounting-preview")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Previsualizar asientos contables de la nómina" })
  async previewAccounting(@Req() req, @Param("id") id: string) {
    return this.payrollRunsService.previewAccounting(req.user.tenantId, id);
  }

  @Post("concepts/remap-accounts")
  @Permissions("payroll_employees_write")
  @ApiOperation({
    summary: "Remapear cuentas contables de conceptos de nómina (batch)",
  })
  async remapConceptAccounts(@Req() req, @Body() dto: RemapPayrollAccountsDto) {
    return this.payrollRunsService.remapConceptAccounts(
      req.user.tenantId,
      dto,
      req.user.id,
    );
  }

  @Post("runs/:id/adjustments")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Agregar ajustes manuales a una nómina calculada" })
  async addAdjustment(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: AddPayrollAdjustmentDto,
  ) {
    return this.payrollRunsService.addAdjustment(
      req.user.tenantId,
      id,
      dto,
      req.user.id,
    );
  }

  @Post("special-runs")
  @Permissions("payroll_employees_write")
  @ApiOperation({
    summary: "Crear ejecución especial (aguinaldos/bonos/liquidaciones)",
  })
  async createSpecialRun(@Req() req, @Body() dto: CreateSpecialPayrollRunDto) {
    return this.payrollRunsService.createSpecialRun(
      req.user.tenantId,
      dto,
      req.user.id,
    );
  }

  @Get("special-runs")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Listar ejecuciones especiales de nómina" })
  async listSpecialRuns(
    @Req() req,
    @Query() filters: SpecialPayrollRunFiltersDto,
  ) {
    return this.payrollRunsService.listSpecialRuns(req.user.tenantId, filters);
  }

  @Get("special-runs/:id")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Detalle de ejecución especial" })
  async getSpecialRun(@Req() req, @Param("id") id: string) {
    return this.payrollRunsService.getSpecialRun(req.user.tenantId, id);
  }

  @Patch("special-runs/:id/status")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Actualizar estado de ejecución especial" })
  async updateSpecialRunStatus(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: UpdateSpecialPayrollRunStatusDto,
  ) {
    return this.payrollRunsService.updateSpecialRunStatus(
      req.user.tenantId,
      id,
      dto.status,
      req.user.id,
    );
  }

  @Get("special-runs/:id/accounting-preview")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Preview contable para ejecución especial" })
  async previewSpecialRunAccounting(@Req() req, @Param("id") id: string) {
    return this.payrollRunsService.previewSpecialRunAccounting(
      req.user.tenantId,
      id,
    );
  }

  @Post("special-runs/:id/pay")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Pagar ejecución especial (usa Payables/Payments)" })
  async paySpecialRun(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: PayPayrollRunDto,
  ) {
    return this.payrollRunsService.paySpecialRun(
      req.user.tenantId,
      id,
      dto,
      req.user.id,
    );
  }
}
