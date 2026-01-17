import {
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
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { FeatureFlagsService } from "../../config/feature-flags.service";
import {
  BinLocationsService,
  CreateBinLocationDto,
  UpdateBinLocationDto,
} from "./bin-locations.service";

@Controller("bin-locations")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class BinLocationsController {
  constructor(
    private readonly binLocationsService: BinLocationsService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  private async ensureMultiWarehouseEnabled() {
    const isEnabled = await this.featureFlagsService.isFeatureEnabled("MULTI_WAREHOUSE");
    if (!isEnabled) {
      throw new BadRequestException(
        "Multi-warehouse está deshabilitado. Las ubicaciones bin requieren esta funcionalidad.",
      );
    }
  }

  @Post()
  @Permissions("inventory_write")
  async create(@Body() dto: CreateBinLocationDto, @Request() req) {
    await this.ensureMultiWarehouseEnabled();
    return this.binLocationsService.create(dto, req.user.tenantId, req.user.id);
  }

  @Get()
  @Permissions("inventory_read")
  async findAll(
    @Query("warehouseId") warehouseId: string,
    @Query("includeInactive") includeInactive: string,
    @Request() req,
  ) {
    await this.ensureMultiWarehouseEnabled();
    return this.binLocationsService.findAll(
      req.user.tenantId,
      warehouseId,
      includeInactive === "true",
    );
  }

  @Get(":id")
  @Permissions("inventory_read")
  async findOne(@Param("id") id: string, @Request() req) {
    await this.ensureMultiWarehouseEnabled();
    return this.binLocationsService.findOne(id, req.user.tenantId);
  }

  @Patch(":id")
  @Permissions("inventory_write")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateBinLocationDto,
    @Request() req,
  ) {
    await this.ensureMultiWarehouseEnabled();
    return this.binLocationsService.update(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(":id")
  @Permissions("inventory_write")
  async delete(@Param("id") id: string, @Request() req) {
    await this.ensureMultiWarehouseEnabled();
    return this.binLocationsService.delete(id, req.user.tenantId);
  }
}
