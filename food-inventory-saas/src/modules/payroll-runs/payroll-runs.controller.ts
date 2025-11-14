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
import { Response } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PayrollRunsService } from "./payroll-runs.service";
import { CreatePayrollConceptDto } from "./dto/create-payroll-concept.dto";
import { UpdatePayrollConceptDto } from "./dto/update-payroll-concept.dto";
import { CreatePayrollRunDto } from "./dto/create-payroll-run.dto";
import { PayrollRunFiltersDto } from "./dto/payroll-run-filters.dto";
import { ExportPayrollRunDto } from "./dto/export-payroll-run.dto";
import { PayrollConceptFiltersDto } from "./dto/payroll-concept-filters.dto";
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
    return this.payrollRunsService.createConcept(req.user.tenantId, dto, req.user.id);
  }

  @Patch("concepts/:id")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Actualizar concepto" })
  async updateConcept(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: UpdatePayrollConceptDto,
  ) {
    return this.payrollRunsService.updateConcept(req.user.tenantId, id, dto, req.user.id);
  }

  @Get("concepts")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Listar conceptos" })
  async listConcepts(
    @Req() req,
    @Query() filters: PayrollConceptFiltersDto,
  ) {
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
    return this.payrollRunsService.createRun(req.user.tenantId, dto, req.user.id);
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
      .setHeader("Content-Disposition", `attachment; filename=\"${file.filename}\"`)
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
}
