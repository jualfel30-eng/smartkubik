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
import { EduAttendanceService } from "./edu-attendance.service";
import { CreateAttendanceDto } from "./dto/create-attendance.dto";
import { UpdateAttendanceDto } from "./dto/update-attendance.dto";
import { AttendanceFiltersDto } from "./dto/attendance-filters.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("education-attendance")
@Controller("education/attendance")
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class EduAttendanceController {
  constructor(private readonly service: EduAttendanceService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_attendance_create")
  @ApiOperation({ summary: "Registrar asistencia" })
  async create(@Request() req, @Body() dto: CreateAttendanceDto) {
    try {
      const result = await this.service.create(dto, req.user.tenantId, req.user.id);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al registrar asistencia",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_attendance_read")
  @ApiOperation({ summary: "Listar registros de asistencia" })
  async findAll(@Request() req, @Query() filters: AttendanceFiltersDto) {
    try {
      const result = await this.service.findAll(req.user.tenantId, filters);
      return { success: true, ...result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al listar asistencia",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_attendance_read")
  @ApiOperation({ summary: "Obtener registro de asistencia por ID" })
  async findOne(@Request() req, @Param("id") id: string) {
    try {
      const result = await this.service.findOne(id, req.user.tenantId);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener asistencia",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_attendance_update")
  @ApiOperation({ summary: "Actualizar registro de asistencia" })
  async update(@Request() req, @Param("id") id: string, @Body() dto: UpdateAttendanceDto) {
    try {
      const result = await this.service.update(id, req.user.tenantId, dto);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar asistencia",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_attendance_delete")
  @ApiOperation({ summary: "Eliminar registro de asistencia (soft-delete)" })
  async remove(@Request() req, @Param("id") id: string) {
    try {
      const result = await this.service.remove(id, req.user.tenantId);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || "Error al eliminar asistencia",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
