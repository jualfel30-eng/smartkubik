import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { WarehousesService } from "./warehouses.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { CreateWarehouseDto, UpdateWarehouseDto } from "../../dto/warehouse.dto";
import { FEATURES } from "../../config/features.config";

@Controller("warehouses")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  private ensureMultiWarehouseEnabled() {
    if (!FEATURES.MULTI_WAREHOUSE) {
      throw new BadRequestException(
        "Multi-warehouse está deshabilitado. Contacta a soporte para activarlo.",
      );
    }
  }

  @Get()
  @Permissions("inventory_read")
  async findAll(
    @Request() req,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.warehousesService.findAll(
      req.user.tenantId,
      includeInactive === "true",
    );
  }

  @Post()
  @Permissions("inventory_write")
  async create(@Body() dto: CreateWarehouseDto, @Request() req) {
    this.ensureMultiWarehouseEnabled();
    return this.warehousesService.create(dto, req.user.tenantId, req.user.id);
  }

  @Patch(":id")
  @Permissions("inventory_write")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateWarehouseDto,
    @Request() req,
  ) {
    this.ensureMultiWarehouseEnabled();
    return this.warehousesService.update(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(":id")
  @Permissions("inventory_write")
  async delete(@Param("id") id: string, @Request() req) {
    this.ensureMultiWarehouseEnabled();
    await this.warehousesService.delete(id, req.user.tenantId);
    return { message: "Warehouse deleted successfully" };
  }
}
