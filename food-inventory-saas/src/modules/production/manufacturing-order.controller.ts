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
import { ManufacturingOrderService } from "./manufacturing-order.service";
import {
  CreateManufacturingOrderDto,
  UpdateManufacturingOrderDto,
  ManufacturingOrderQueryDto,
  ConfirmManufacturingOrderDto,
  CheckMaterialsDto,
  EstimateCostDto,
} from "../../dto/manufacturing-order.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("manufacturing-orders")
export class ManufacturingOrderController {
  constructor(private readonly moService: ManufacturingOrderService) {}

  @Post()
  async create(@Body() dto: CreateManufacturingOrderDto, @Request() req) {
    const data = await this.moService.create(dto, req.user);
    return { success: true, data };
  }

  @Post("check-materials")
  async checkMaterials(@Body() dto: CheckMaterialsDto, @Request() req) {
    const data = await this.moService.checkMaterialsAvailability(
      dto.bomId,
      dto.quantity,
      dto.unit,
      req.user,
    );
    return { success: true, data };
  }

  @Post("estimate-cost")
  async estimateCost(@Body() dto: EstimateCostDto, @Request() req) {
    const data = await this.moService.estimateProductionCost(
      dto.bomId,
      dto.routingId,
      dto.quantity,
      dto.unit,
      req.user,
    );
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: ManufacturingOrderQueryDto, @Request() req) {
    const result = await this.moService.findAll(query, req.user);
    return { success: true, ...result };
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req) {
    const data = await this.moService.findOne(id, req.user);
    return { success: true, data };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateManufacturingOrderDto,
    @Request() req,
  ) {
    const data = await this.moService.update(id, dto, req.user);
    return { success: true, data };
  }

  @Post(":id/confirm")
  async confirm(
    @Param("id") id: string,
    @Body() dto: ConfirmManufacturingOrderDto,
    @Request() req,
  ) {
    const data = await this.moService.confirm(id, dto, req.user);
    return { success: true, data };
  }

  @Post(":id/start")
  async start(@Param("id") id: string, @Request() req) {
    const data = await this.moService.start(id, req.user);
    return { success: true, data };
  }

  @Post(":id/complete")
  async complete(@Param("id") id: string, @Request() req) {
    const data = await this.moService.complete(id, req.user);
    return { success: true, data };
  }

  @Post(":id/cancel")
  async cancel(@Param("id") id: string, @Request() req) {
    const data = await this.moService.cancel(id, req.user);
    return { success: true, data };
  }

  @Post(":id/operations/:operationId/start")
  async startOperation(
    @Param("id") id: string,
    @Param("operationId") operationId: string,
    @Request() req,
  ) {
    const data = await this.moService.startOperation(id, operationId, req.user);
    return { success: true, data };
  }

  @Post(":id/operations/:operationId/complete")
  async completeOperation(
    @Param("id") id: string,
    @Param("operationId") operationId: string,
    @Body() dto: any,
    @Request() req,
  ) {
    const data = await this.moService.completeOperation(
      id,
      operationId,
      dto,
      req.user,
    );
    return { success: true, data };
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Request() req) {
    await this.moService.delete(id, req.user);
    return {
      success: true,
      message: "Orden de manufactura eliminada correctamente",
    };
  }

  /**
   * Calcula fechas programadas basadas en capacidad de work centers
   * POST /manufacturing-orders/:id/calculate-schedule
   */
  @Post(":id/calculate-schedule")
  async calculateSchedule(
    @Param("id") id: string,
    @Body("startDate") startDate: string,
    @Request() req,
  ) {
    const data = await this.moService.calculateScheduledDates(
      id,
      new Date(startDate),
      req.user,
    );
    return { success: true, data };
  }

  /**
   * Detecta conflictos de recursos (materiales y capacidad)
   * GET /manufacturing-orders/:id/detect-conflicts
   */
  @Get(":id/detect-conflicts")
  async detectConflicts(@Param("id") id: string, @Request() req) {
    const data = await this.moService.detectResourceConflicts(id, req.user);
    return { success: true, data };
  }

  /**
   * Sugiere fechas alternativas para re-scheduling
   * GET /manufacturing-orders/:id/suggest-reschedule
   */
  @Get(":id/suggest-reschedule")
  async suggestReschedule(@Param("id") id: string, @Request() req) {
    const data = await this.moService.suggestRescheduling(id, req.user);
    return { success: true, data };
  }

  /**
   * Genera requisiciones de compra para materiales faltantes
   * GET /manufacturing-orders/:id/generate-requisitions
   */
  @Get(":id/generate-requisitions")
  async generateRequisitions(@Param("id") id: string, @Request() req) {
    const data = await this.moService.generatePurchaseRequisitions(
      id,
      req.user,
    );
    return { success: true, data };
  }

  /**
   * Crea órdenes de compra draft agrupadas por proveedor
   * POST /manufacturing-orders/:id/create-purchase-orders
   */
  @Post(":id/create-purchase-orders")
  async createPurchaseOrders(@Param("id") id: string, @Request() req) {
    const data = await this.moService.createPurchaseOrdersFromRequisitions(
      id,
      req.user,
    );
    return { success: true, data };
  }

  /**
   * Dashboard de eficiencia de producción
   * GET /manufacturing-orders/dashboards/efficiency?startDate=X&endDate=Y
   */
  @Get("dashboards/efficiency")
  async getEfficiencyDashboard(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Request() req,
  ) {
    const data = await this.moService.getProductionEfficiencyDashboard(
      new Date(startDate),
      new Date(endDate),
      req.user,
    );
    return { success: true, data };
  }

  /**
   * Dashboard de costos de producción
   * GET /manufacturing-orders/dashboards/costs?startDate=X&endDate=Y
   */
  @Get("dashboards/costs")
  async getCostsDashboard(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Request() req,
  ) {
    const data = await this.moService.getProductionCostsDashboard(
      new Date(startDate),
      new Date(endDate),
      req.user,
    );
    return { success: true, data };
  }

  /**
   * Dashboard de utilización de work centers
   * GET /manufacturing-orders/dashboards/work-center-utilization?startDate=X&endDate=Y
   */
  @Get("dashboards/work-center-utilization")
  async getWorkCenterUtilizationDashboard(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Request() req,
  ) {
    const data = await this.moService.getWorkCenterUtilizationDashboard(
      new Date(startDate),
      new Date(endDate),
      req.user,
    );
    return { success: true, data };
  }

  /**
   * Dashboard de trending de varianzas
   * GET /manufacturing-orders/dashboards/variances-trending?startDate=X&endDate=Y
   */
  @Get("dashboards/variances-trending")
  async getVariancesTrendingDashboard(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Request() req,
  ) {
    const data = await this.moService.getVariancesTrendingDashboard(
      new Date(startDate),
      new Date(endDate),
      req.user,
    );
    return { success: true, data };
  }
}
