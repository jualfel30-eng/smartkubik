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
import { EduStudentsService } from "./edu-students.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { StudentFiltersDto } from "./dto/student-filters.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("education-students")
@Controller("education/students")
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class EduStudentsController {
  constructor(private readonly service: EduStudentsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_students_write")
  @ApiOperation({ summary: "Crear alumno" })
  async create(@Request() req, @Body() dto: CreateStudentDto) {
    try {
      const result = await this.service.create(dto, req.user.tenantId, req.user.id);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear alumno",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_students_read")
  @ApiOperation({ summary: "Listar alumnos" })
  async findAll(@Request() req, @Query() filters: StudentFiltersDto) {
    try {
      const result = await this.service.findAll(req.user.tenantId, filters);
      return { success: true, ...result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al listar alumnos",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_students_read")
  @ApiOperation({ summary: "Obtener alumno por ID" })
  async findOne(@Request() req, @Param("id") id: string) {
    try {
      const result = await this.service.findOne(id, req.user.tenantId);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener alumno",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_students_write")
  @ApiOperation({ summary: "Actualizar alumno" })
  async update(@Request() req, @Param("id") id: string, @Body() dto: UpdateStudentDto) {
    try {
      const result = await this.service.update(id, req.user.tenantId, dto);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar alumno",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_students_write")
  @ApiOperation({ summary: "Eliminar alumno (soft-delete)" })
  async remove(@Request() req, @Param("id") id: string) {
    try {
      const result = await this.service.remove(id, req.user.tenantId);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || "Error al eliminar alumno",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
