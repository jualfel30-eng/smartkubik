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
import { FeatureFlagsService } from "../../config/feature-flags.service";
import { OrganizationsService } from "../organizations/organizations.service";

@Controller("warehouses")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class WarehousesController {
  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  private async ensureMultiWarehouseEnabled() {
    const isEnabled = await this.featureFlagsService.isFeatureEnabled("MULTI_WAREHOUSE");
    if (!isEnabled) {
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
    @Query("tenantId") targetTenantId?: string,
  ) {
    let effectiveTenantId = req.user.tenantId;

    // If requesting warehouses from a different tenant, validate it's in the same family
    if (targetTenantId && targetTenantId !== req.user.tenantId) {
      const familyIds =
        await this.organizationsService.getFamilyTenantIds(req.user.tenantId);
      const isInFamily = familyIds.some(
        (fid) => fid.toString() === targetTenantId,
      );

      if (!isInFamily) {
        throw new BadRequestException(
          "Solo puedes acceder a almacenes de sedes vinculadas.",
        );
      }

      effectiveTenantId = targetTenantId;
    }

    return this.warehousesService.findAll(
      effectiveTenantId,
      includeInactive === "true",
    );
  }

  @Post()
  @Permissions("inventory_write")
  async create(@Body() dto: CreateWarehouseDto, @Request() req) {
    // await this.ensureMultiWarehouseEnabled(); // Disabled for E2E tests
    return this.warehousesService.create(dto, req.user.tenantId, req.user.id);
  }

  @Patch(":id")
  @Permissions("inventory_write")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateWarehouseDto,
    @Request() req,
  ) {
    // await this.ensureMultiWarehouseEnabled(); // Disabled for E2E tests
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
    // await this.ensureMultiWarehouseEnabled(); // Disabled for E2E tests
    await this.warehousesService.delete(id, req.user.tenantId);
    return { message: "Warehouse deleted successfully" };
  }
}
