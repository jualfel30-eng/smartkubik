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
} from "@nestjs/common";
import { BusinessLocationsService } from "./business-locations.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import {
  CreateBusinessLocationDto,
  UpdateBusinessLocationDto,
  BusinessLocationFilterDto,
} from "../../dto/business-location.dto";

@Controller("business-locations")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class BusinessLocationsController {
  constructor(
    private readonly businessLocationsService: BusinessLocationsService,
  ) {}

  @Get()
  @Permissions("locations_read")
  async findAll(@Request() req, @Query() filters: BusinessLocationFilterDto) {
    return this.businessLocationsService.findAll(req.user.tenantId, filters);
  }

  @Get(":id")
  @Permissions("locations_read")
  async findById(@Param("id") id: string, @Request() req) {
    return this.businessLocationsService.findById(id, req.user.tenantId);
  }

  @Get(":id/inventory-summary")
  @Permissions("locations_read")
  async getInventorySummary(@Param("id") id: string, @Request() req) {
    return this.businessLocationsService.getInventorySummary(
      id,
      req.user.tenantId,
    );
  }

  @Post()
  @Permissions("locations_write")
  async create(@Body() dto: CreateBusinessLocationDto, @Request() req) {
    return this.businessLocationsService.create(
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Patch(":id")
  @Permissions("locations_write")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateBusinessLocationDto,
    @Request() req,
  ) {
    return this.businessLocationsService.update(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(":id")
  @Permissions("locations_write")
  async delete(@Param("id") id: string, @Request() req) {
    await this.businessLocationsService.softDelete(id, req.user.tenantId);
    return { message: "Sede eliminada exitosamente." };
  }
}
