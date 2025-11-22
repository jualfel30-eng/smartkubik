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
import { WasteService } from "./waste.service";
import {
  CreateWasteEntryDto,
  UpdateWasteEntryDto,
  WasteQueryDto,
} from "../../dto/waste.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@Controller("waste")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class WasteController {
  constructor(private readonly wasteService: WasteService) {}

  // ========== CRUD ==========

  /**
   * POST /waste
   * Crear nueva entrada de desperdicio
   */
  @Post()
  @Permissions("inventory_write")
  async create(@Body() dto: CreateWasteEntryDto, @Req() req) {
    return this.wasteService.create(
      dto,
      req.user.tenantId,
      req.user.userId,
      req.user.name,
    );
  }

  /**
   * GET /waste
   * Obtener todas las entradas con filtros
   */
  @Get()
  @Permissions("inventory_read")
  async findAll(@Query() query: WasteQueryDto, @Req() req) {
    return this.wasteService.findAll(query, req.user.tenantId);
  }

  /**
   * GET /waste/:id
   * Obtener una entrada específica
   */
  @Get(":id")
  @Permissions("inventory_read")
  async findOne(@Param("id") id: string, @Req() req) {
    return this.wasteService.findOne(id, req.user.tenantId);
  }

  /**
   * PATCH /waste/:id
   * Actualizar una entrada
   */
  @Patch(":id")
  @Permissions("inventory_write")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateWasteEntryDto,
    @Req() req,
  ) {
    return this.wasteService.update(id, dto, req.user.tenantId);
  }

  /**
   * DELETE /waste/:id
   * Eliminar entrada (soft delete)
   */
  @Delete(":id")
  @Permissions("inventory_write")
  async remove(@Param("id") id: string, @Req() req) {
    await this.wasteService.remove(id, req.user.tenantId);
    return { message: "Waste entry removed successfully" };
  }

  // ========== ANALYTICS Y REPORTES ==========

  /**
   * GET /waste/analytics/overview
   * Obtener analytics completo de desperdicios
   */
  @Get("analytics/overview")
  @Permissions("inventory_read")
  async getAnalytics(@Query() query: WasteQueryDto, @Req() req) {
    return this.wasteService.getAnalytics(query, req.user.tenantId);
  }

  /**
   * GET /waste/analytics/trends
   * Obtener tendencias temporales
   */
  @Get("analytics/trends")
  @Permissions("inventory_read")
  async getTrends(@Query() query: WasteQueryDto, @Req() req) {
    return this.wasteService.getTrends(query, req.user.tenantId);
  }
}
