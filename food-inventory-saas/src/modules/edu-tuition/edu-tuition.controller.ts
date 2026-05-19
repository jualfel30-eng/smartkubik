import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { EduTuitionService } from "./edu-tuition.service";
import { CreateTuitionDto } from "./dto/create-tuition.dto";
import { UpdateTuitionDto } from "./dto/update-tuition.dto";
import { TuitionFiltersDto } from "./dto/tuition-filters.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("education-tuition")
@Controller("education/tuition")
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class EduTuitionController {
  constructor(private readonly service: EduTuitionService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_tuition_create")
  @ApiOperation({ summary: "Crear cuota de pensión" })
  async create(@Request() req, @Body() dto: CreateTuitionDto) {
    try {
      const result = await this.service.create(dto, req.user.tenantId, req.user.id);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear cuota",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_tuition_read")
  @ApiOperation({ summary: "Listar cuotas de pensión" })
  async findAll(@Request() req, @Query() filters: TuitionFiltersDto) {
    try {
      const result = await this.service.findAll(req.user.tenantId, filters);
      return { success: true, ...result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al listar cuotas",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_tuition_read")
  @ApiOperation({ summary: "Obtener cuota por ID" })
  async findOne(@Request() req, @Param("id") id: string) {
    try {
      const result = await this.service.findOne(id, req.user.tenantId);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener cuota",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_tuition_update")
  @ApiOperation({ summary: "Actualizar cuota de pensión" })
  async update(@Request() req, @Param("id") id: string, @Body() dto: UpdateTuitionDto) {
    try {
      const result = await this.service.update(id, req.user.tenantId, dto);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar cuota",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_tuition_delete")
  @ApiOperation({ summary: "Eliminar cuota (soft-delete)" })
  async remove(@Request() req, @Param("id") id: string) {
    try {
      const result = await this.service.remove(id, req.user.tenantId);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || "Error al eliminar cuota",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
