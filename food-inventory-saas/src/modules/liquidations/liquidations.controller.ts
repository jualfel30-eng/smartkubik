import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { LiquidationsService } from "./liquidations.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { CreateLiquidationRuleSetDto } from "./dto/create-liquidation-ruleset.dto";
import { CreateLiquidationRunDto } from "./dto/create-liquidation-run.dto";

@ApiTags("liquidations")
@ApiBearerAuth()
@Controller("liquidations")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class LiquidationsController {
  constructor(private readonly liquidationsService: LiquidationsService) {}

  @Post("rules")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Crear regla de liquidación (VE)" })
  async createRule(@Req() req, @Body() dto: CreateLiquidationRuleSetDto) {
    return this.liquidationsService.createRuleSet(req.user.tenantId, dto);
  }

  @Get("rules")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Listar reglas de liquidación" })
  async listRules(@Req() req) {
    return this.liquidationsService.listRuleSets(req.user.tenantId);
  }

  @Post("runs")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Crear liquidación (draft)" })
  async createRun(@Req() req, @Body() dto: CreateLiquidationRunDto) {
    return this.liquidationsService.createRun(req.user.tenantId, dto);
  }

  @Get("runs")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Listar liquidaciones" })
  async listRuns(@Req() req) {
    return this.liquidationsService.listRuns(req.user.tenantId);
  }

  @Post("runs/:id/calculate")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Calcular liquidación" })
  async calculate(@Req() req, @Param("id") id: string) {
    return this.liquidationsService.calculateRun(req.user.tenantId, id);
  }

  @Post("runs/:id/approve")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Aprobar liquidación y generar payable" })
  async approve(@Req() req, @Param("id") id: string) {
    return this.liquidationsService.approveRun(
      req.user.tenantId,
      id,
      req.user.id,
    );
  }

  @Post("runs/:id/pay")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Pagar liquidación (usa Payables/Payments)" })
  async pay(@Req() req, @Param("id") id: string, @Body() body) {
    return this.liquidationsService.payRun(
      req.user.tenantId,
      id,
      body,
      req.user.id,
    );
  }

  @Get("runs/:id/export")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Exportar liquidación (CSV/PDF)" })
  async exportRun(@Req() req, @Param("id") id: string, @Res() res) {
    const file = await this.liquidationsService.exportRun(
      req.user.tenantId,
      id,
      (req.query?.format as any) || "csv",
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
  @ApiOperation({ summary: "Preview contable de liquidación" })
  async previewAccounting(@Req() req, @Param("id") id: string) {
    return this.liquidationsService.previewAccounting(req.user.tenantId, id);
  }
}
