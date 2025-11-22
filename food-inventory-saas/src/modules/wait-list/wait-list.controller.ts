import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request as Req,
} from "@nestjs/common";
import { WaitListService } from "./wait-list.service";
import {
  CreateWaitListEntryDto,
  UpdateWaitListEntryDto,
  NotifyCustomerDto,
  SeatFromWaitListDto,
  UpdateWaitListStatusDto,
  WaitListQueryDto,
} from "../../dto/wait-list.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@Controller("wait-list")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class WaitListController {
  constructor(private readonly waitListService: WaitListService) {}

  // ========== CRUD ==========

  /**
   * POST /wait-list
   * Crear nueva entrada en la lista de espera
   */
  @Post()
  @Permissions("restaurant_write")
  async create(@Body() dto: CreateWaitListEntryDto, @Req() req) {
    return this.waitListService.create(dto, req.user.tenantId);
  }

  /**
   * GET /wait-list
   * Obtener todas las entradas (con filtros)
   */
  @Get()
  @Permissions("restaurant_read")
  async findAll(@Query() query: WaitListQueryDto, @Req() req) {
    return this.waitListService.findAll(query, req.user.tenantId);
  }

  /**
   * GET /wait-list/:id
   * Obtener una entrada específica
   */
  @Get(":id")
  @Permissions("restaurant_read")
  async findOne(@Param("id") id: string, @Req() req) {
    return this.waitListService.findOne(id, req.user.tenantId);
  }

  /**
   * PATCH /wait-list/:id
   * Actualizar una entrada
   */
  @Patch(":id")
  @Permissions("restaurant_write")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateWaitListEntryDto,
    @Req() req,
  ) {
    return this.waitListService.update(id, dto, req.user.tenantId);
  }

  /**
   * DELETE /wait-list/:id
   * Eliminar entrada (soft delete)
   */
  @Delete(":id")
  @Permissions("restaurant_write")
  async remove(@Param("id") id: string, @Req() req) {
    await this.waitListService.remove(id, req.user.tenantId);
    return { message: "Wait list entry removed successfully" };
  }

  // ========== ACCIONES ESPECÍFICAS ==========

  /**
   * PATCH /wait-list/:id/status
   * Actualizar estado de una entrada
   */
  @Patch(":id/status")
  @Permissions("restaurant_write")
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateWaitListStatusDto,
    @Req() req,
  ) {
    return this.waitListService.updateStatus(id, dto, req.user.tenantId);
  }

  /**
   * POST /wait-list/notify
   * Notificar a un cliente que su mesa está lista
   */
  @Post("notify")
  @Permissions("restaurant_write")
  async notifyCustomer(@Body() dto: NotifyCustomerDto, @Req() req) {
    return this.waitListService.notifyCustomer(dto, req.user.tenantId);
  }

  /**
   * POST /wait-list/seat
   * Sentar a un cliente desde la wait list
   */
  @Post("seat")
  @Permissions("restaurant_write")
  async seatCustomer(@Body() dto: SeatFromWaitListDto, @Req() req) {
    return this.waitListService.seatCustomer(dto, req.user.tenantId);
  }

  // ========== ESTADÍSTICAS Y REPORTES ==========

  /**
   * GET /wait-list/stats/overview
   * Obtener estadísticas de la wait list
   */
  @Get("stats/overview")
  @Permissions("restaurant_read")
  async getStats(@Req() req) {
    return this.waitListService.getStats(req.user.tenantId);
  }

  /**
   * GET /wait-list/estimate/:partySize
   * Estimar tiempo de espera para un grupo
   */
  @Get("estimate/:partySize")
  @Permissions("restaurant_read")
  async estimateWaitTime(@Param("partySize") partySize: string, @Req() req) {
    return this.waitListService.estimateWaitTime(
      parseInt(partySize, 10),
      req.user.tenantId,
    );
  }
}
