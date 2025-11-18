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
import { TipsService } from "./tips.service";
import {
  CreateTipsDistributionRuleDto,
  UpdateTipsDistributionRuleDto,
  DistributeTipsDto,
  RegisterTipsDto,
  TipsReportQueryDto,
  ConsolidatedTipsQueryDto,
  ExportTipsToPayrollDto,
  CalculateTipsTaxesDto,
} from "../../dto/tips.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@Controller("tips")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class TipsController {
  constructor(private readonly tipsService: TipsService) {}

  // ========== Distribution Rules ==========

  @Post("distribution-rules")
  @Permissions("payroll_write", "tips_write")
  async createDistributionRule(
    @Body() dto: CreateTipsDistributionRuleDto,
    @Req() req,
  ) {
    return this.tipsService.createDistributionRule(dto, req.user.tenantId);
  }

  @Get("distribution-rules")
  @Permissions("payroll_read", "tips_read")
  async findAllDistributionRules(@Req() req) {
    return this.tipsService.findAllDistributionRules(req.user.tenantId);
  }

  @Get("distribution-rules/active")
  @Permissions("payroll_read", "tips_read")
  async findActiveDistributionRule(@Req() req) {
    return this.tipsService.findActiveDistributionRule(req.user.tenantId);
  }

  @Put("distribution-rules/:id")
  @Permissions("payroll_write", "tips_write")
  async updateDistributionRule(
    @Param("id") id: string,
    @Body() dto: UpdateTipsDistributionRuleDto,
    @Req() req,
  ) {
    return this.tipsService.updateDistributionRule(
      id,
      dto,
      req.user.tenantId,
    );
  }

  @Delete("distribution-rules/:id")
  @Permissions("payroll_write", "tips_write")
  async deleteDistributionRule(@Param("id") id: string, @Req() req) {
    await this.tipsService.deleteDistributionRule(id, req.user.tenantId);
    return { message: "Distribution rule deleted successfully" };
  }

  // ========== Register Tips on Orders ==========

  @Patch("orders/:orderId")
  @Permissions("orders_write", "tips_write")
  async registerTipsOnOrder(
    @Param("orderId") orderId: string,
    @Body() dto: RegisterTipsDto,
    @Req() req,
  ) {
    return this.tipsService.registerTipsOnOrder(
      orderId,
      dto,
      req.user.tenantId,
    );
  }

  // ========== Distribution ==========

  @Post("distribute")
  @Permissions("payroll_write", "tips_write")
  async distributeTips(@Body() dto: DistributeTipsDto, @Req() req) {
    return this.tipsService.distributeTips(dto, req.user.tenantId);
  }

  // ========== Reports ==========

  @Get("report/:employeeId")
  @Permissions("payroll_read", "tips_read")
  async getTipsReportForEmployee(
    @Param("employeeId") employeeId: string,
    @Query() query: TipsReportQueryDto,
    @Req() req,
  ) {
    const startDate = query.start ? new Date(query.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.end ? new Date(query.end) : new Date();

    return this.tipsService.getTipsReportForEmployee(
      employeeId,
      startDate,
      endDate,
      req.user.tenantId,
    );
  }

  @Get("consolidated")
  @Permissions("payroll_read", "tips_read", "reports_read")
  async getConsolidatedReport(
    @Query() query: ConsolidatedTipsQueryDto,
    @Req() req,
  ) {
    let startDate: Date;
    let endDate: Date = new Date();

    if (query.period) {
      // Parse period strings like 'last-week', 'last-month'
      const now = Date.now();
      switch (query.period) {
        case "last-week":
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case "last-month":
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
          break;
        case "last-3-months":
          startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      }
    } else if (query.start && query.end) {
      startDate = new Date(query.start);
      endDate = new Date(query.end);
    } else {
      // Default: last 30 days
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    return this.tipsService.getConsolidatedReport(
      startDate,
      endDate,
      req.user.tenantId,
    );
  }

  // ========== PAYROLL INTEGRATION ==========

  /**
   * POST /tips/export-to-payroll
   * Exportar propinas a nómina
   */
  @Post("export-to-payroll")
  @Permissions("payroll_write", "tips_write")
  async exportToPayroll(@Body() dto: ExportTipsToPayrollDto, @Req() req) {
    return this.tipsService.exportToPayroll(dto, req.user.tenantId);
  }

  /**
   * POST /tips/calculate-taxes
   * Calcular impuestos sobre propinas
   */
  @Post("calculate-taxes")
  @Permissions("payroll_read", "tips_read")
  async calculateTaxes(@Body() dto: CalculateTipsTaxesDto, @Req() req) {
    return this.tipsService.calculateTipsTaxes(dto, req.user.tenantId);
  }
}
