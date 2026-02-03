import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FixedAssetsService } from "./fixed-assets.service";
import {
  CreateFixedAssetDto,
  UpdateFixedAssetDto,
} from "../../dto/fixed-asset.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@Controller("fixed-assets")
@UseGuards(JwtAuthGuard, TenantGuard)
export class FixedAssetsController {
  constructor(private readonly fixedAssetsService: FixedAssetsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions("reports_create")
  async create(@Req() req, @Body() dto: CreateFixedAssetDto) {
    try {
      const asset = await this.fixedAssetsService.create(
        dto,
        req.user.tenantId,
      );
      return { success: true, data: asset };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear activo fijo",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("reports_read")
  async findAll(@Req() req) {
    try {
      const assets = await this.fixedAssetsService.findAll(req.user.tenantId);
      return { success: true, data: assets };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al listar activos fijos",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("summary")
  @UseGuards(PermissionsGuard)
  @Permissions("reports_read")
  async getSummary(@Req() req) {
    try {
      const summary = await this.fixedAssetsService.getSummary(
        req.user.tenantId,
      );
      return { success: true, data: summary };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener resumen",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("reports_read")
  async findOne(@Req() req, @Param("id") id: string) {
    try {
      const asset = await this.fixedAssetsService.findOne(
        id,
        req.user.tenantId,
      );
      return { success: true, data: asset };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener activo fijo",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("reports_create")
  async update(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: UpdateFixedAssetDto,
  ) {
    try {
      const asset = await this.fixedAssetsService.update(
        id,
        req.user.tenantId,
        dto,
      );
      return { success: true, data: asset };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar activo fijo",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("reports_create")
  async remove(@Req() req, @Param("id") id: string) {
    try {
      await this.fixedAssetsService.remove(id, req.user.tenantId);
      return { success: true, message: "Activo fijo eliminado" };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al eliminar activo fijo",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
