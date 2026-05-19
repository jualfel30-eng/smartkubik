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
import { EduSchedulesService } from "./edu-schedules.service";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { ScheduleFiltersDto } from "./dto/schedule-filters.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("education-schedules")
@Controller("education/schedules")
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class EduSchedulesController {
  constructor(private readonly service: EduSchedulesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_schedules_create")
  @ApiOperation({ summary: "Crear horario" })
  async create(@Request() req, @Body() dto: CreateScheduleDto) {
    try {
      const result = await this.service.create(dto, req.user.tenantId, req.user.id);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear horario",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_schedules_read")
  @ApiOperation({ summary: "Listar horarios" })
  async findAll(@Request() req, @Query() filters: ScheduleFiltersDto) {
    try {
      const result = await this.service.findAll(req.user.tenantId, filters);
      return { success: true, ...result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al listar horarios",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_schedules_read")
  @ApiOperation({ summary: "Obtener horario por ID" })
  async findOne(@Request() req, @Param("id") id: string) {
    try {
      const result = await this.service.findOne(id, req.user.tenantId);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener horario",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_schedules_update")
  @ApiOperation({ summary: "Actualizar horario" })
  async update(@Request() req, @Param("id") id: string, @Body() dto: UpdateScheduleDto) {
    try {
      const result = await this.service.update(id, req.user.tenantId, dto);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar horario",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_schedules_delete")
  @ApiOperation({ summary: "Eliminar horario (soft-delete)" })
  async remove(@Request() req, @Param("id") id: string) {
    try {
      const result = await this.service.remove(id, req.user.tenantId);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || "Error al eliminar horario",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
