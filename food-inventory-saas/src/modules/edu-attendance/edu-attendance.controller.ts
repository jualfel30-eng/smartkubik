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
  @Permissions("edu_attendance_write")
  @ApiOperation({ summary: "Registrar asistencia bulk (upsert por salón/fecha)" })
  async recordAttendance(@Request() req, @Body() dto: CreateAttendanceDto) {
    try {
      const result = await this.service.recordAttendance(dto, req.user.tenantId, req.user.id);
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

  // Rutas específicas antes de :id
  @Get("classroom/:classroomId/summary")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_attendance_read")
  @ApiOperation({ summary: "Resumen % asistencia por alumno en un salón" })
  async getClassroomSummary(@Request() req, @Param("classroomId") classroomId: string) {
    try {
      const result = await this.service.getClassroomSummary(classroomId, req.user.tenantId);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener resumen de asistencia",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("classroom/:classroomId")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_attendance_read")
  @ApiOperation({ summary: "Historial de asistencia del salón entre dos fechas (?from=&to=)" })
  async findByClassroom(
    @Request() req,
    @Param("classroomId") classroomId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    try {
      const result = await this.service.findByClassroomRange(
        classroomId,
        req.user.tenantId,
        from,
        to,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener asistencia del salón",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("student/:studentId")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_attendance_read")
  @ApiOperation({ summary: "Historial de asistencia de un alumno (?academicYear=)" })
  async findByStudent(
    @Request() req,
    @Param("studentId") studentId: string,
    @Query("academicYear") academicYear?: string,
  ) {
    try {
      const result = await this.service.findByStudent(studentId, req.user.tenantId, academicYear);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener asistencia del alumno",
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
  @Permissions("edu_attendance_write")
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
  @Permissions("edu_attendance_write")
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
