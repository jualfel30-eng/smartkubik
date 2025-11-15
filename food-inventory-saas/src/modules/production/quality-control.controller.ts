import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { QualityControlService } from "./quality-control.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import {
  CreateQCPlanDto,
  UpdateQCPlanDto,
  QCPlanQueryDto,
  CreateInspectionDto,
  InspectionQueryDto,
  RecordInspectionResultDto,
  CreateNonConformanceDto,
  UpdateNonConformanceDto,
  NonConformanceQueryDto,
} from "../../dto/quality-control.dto";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("quality-control")
export class QualityControlController {
  constructor(private readonly qcService: QualityControlService) {}

  // ==================== QC PLANS ====================

  @Post("plans")
  async createQCPlan(@Body() dto: CreateQCPlanDto, @Request() req) {
    const data = await this.qcService.createQCPlan(dto, req.user);
    return { success: true, data };
  }

  @Get("plans")
  async findAllQCPlans(@Query() query: QCPlanQueryDto, @Request() req) {
    const result = await this.qcService.findAllQCPlans(query, req.user);
    return { success: true, ...result };
  }

  @Get("plans/:id")
  async findOneQCPlan(@Param("id") id: string, @Request() req) {
    const data = await this.qcService.findOneQCPlan(id, req.user);
    return { success: true, data };
  }

  @Patch("plans/:id")
  async updateQCPlan(
    @Param("id") id: string,
    @Body() dto: UpdateQCPlanDto,
    @Request() req,
  ) {
    const data = await this.qcService.updateQCPlan(id, dto, req.user);
    return { success: true, data };
  }

  @Delete("plans/:id")
  async deleteQCPlan(@Param("id") id: string, @Request() req) {
    await this.qcService.deleteQCPlan(id, req.user);
    return { success: true, message: "Plan de QC eliminado correctamente" };
  }

  @Get("plans/product/:productId")
  async getQCPlansForProduct(
    @Param("productId") productId: string,
    @Request() req,
  ) {
    const data = await this.qcService.getQCPlansForProduct(productId, req.user);
    return { success: true, data };
  }

  // ==================== INSPECTIONS ====================

  @Post("inspections")
  async createInspection(@Body() dto: CreateInspectionDto, @Request() req) {
    const data = await this.qcService.createInspection(dto, req.user);
    return { success: true, data };
  }

  @Get("inspections")
  async findAllInspections(@Query() query: InspectionQueryDto, @Request() req) {
    const result = await this.qcService.findAllInspections(query, req.user);
    return { success: true, ...result };
  }

  @Get("inspections/:id")
  async findOneInspection(@Param("id") id: string, @Request() req) {
    const data = await this.qcService.findOneInspection(id, req.user);
    return { success: true, data };
  }

  @Post("inspections/:id/results")
  async recordInspectionResult(
    @Param("id") id: string,
    @Body() dto: RecordInspectionResultDto,
    @Request() req,
  ) {
    const data = await this.qcService.recordInspectionResult(
      id,
      dto.results,
      req.user,
    );
    return { success: true, data };
  }

  // ==================== NON-CONFORMANCES ====================

  @Post("non-conformances")
  async createNonConformance(
    @Body() dto: CreateNonConformanceDto,
    @Request() req,
  ) {
    const data = await this.qcService.createNonConformance(dto, req.user);
    return { success: true, data };
  }

  @Get("non-conformances")
  async findAllNonConformances(
    @Query() query: NonConformanceQueryDto,
    @Request() req,
  ) {
    const result = await this.qcService.findAllNonConformances(query, req.user);
    return { success: true, ...result };
  }

  @Patch("non-conformances/:id")
  async updateNonConformance(
    @Param("id") id: string,
    @Body() dto: UpdateNonConformanceDto,
    @Request() req,
  ) {
    const data = await this.qcService.updateNonConformance(id, dto, req.user);
    return { success: true, data };
  }

  // ==================== CERTIFICATE OF ANALYSIS ====================

  @Get("coa/:lotNumber")
  async generateCoA(@Param("lotNumber") lotNumber: string, @Request() req) {
    const data = await this.qcService.generateCoA(lotNumber, req.user);
    return { success: true, data };
  }
}
