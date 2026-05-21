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
import { EduGradesService } from "./edu-grades.service";
import { CreateGradeDto } from "./dto/create-grade.dto";
import { UpdateGradeDto } from "./dto/update-grade.dto";
import { PublishGradesDto } from "./dto/publish-grades.dto";
import { GradeFiltersDto } from "./dto/grade-filters.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("education-grades")
@Controller("education/grades")
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class EduGradesController {
  constructor(private readonly service: EduGradesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_grades_write")
  @ApiOperation({ summary: "Crear nota (draft, con auth por materia para docentes)" })
  async create(@Request() req, @Body() dto: CreateGradeDto) {
    try {
      const result = await this.service.create(
        dto,
        req.user.tenantId,
        req.user.id,
        req.user.role?.name,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear nota",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Debe ir antes de GET :id
  @Post("publish")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_grades_write")
  @ApiOperation({ summary: "Publicar calificaciones en bloque (emite edu.grades.published)" })
  async publishGrades(@Request() req, @Body() dto: PublishGradesDto) {
    try {
      const result = await this.service.publishGrades(dto, req.user.tenantId, req.user.id);
      return { success: true, ...result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al publicar notas",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_grades_read")
  @ApiOperation({ summary: "Listar notas" })
  async findAll(@Request() req, @Query() filters: GradeFiltersDto) {
    try {
      const result = await this.service.findAll(req.user.tenantId, filters);
      return { success: true, ...result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al listar notas",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Rutas específicas antes de :id para que Express no las capture como parámetro
  @Get("classroom/:classroomId")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_grades_read")
  @ApiOperation({ summary: "Notas del salón (admin)" })
  async findByClassroom(
    @Request() req,
    @Param("classroomId") classroomId: string,
    @Query() filters: GradeFiltersDto,
  ) {
    try {
      const result = await this.service.findByClassroom(classroomId, req.user.tenantId, filters);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener notas del salón",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("student/:studentId")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_grades_read")
  @ApiOperation({ summary: "Notas del alumno (portal y admin)" })
  async findByStudent(
    @Request() req,
    @Param("studentId") studentId: string,
    @Query("onlyPublished") onlyPublished?: string,
  ) {
    try {
      const result = await this.service.findByStudent(
        studentId,
        req.user.tenantId,
        onlyPublished === "true",
      );
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener notas del alumno",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("subject/:subjectId")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_grades_read")
  @ApiOperation({ summary: "Notas por materia" })
  async findBySubject(
    @Request() req,
    @Param("subjectId") subjectId: string,
    @Query() filters: GradeFiltersDto,
  ) {
    try {
      const result = await this.service.findBySubject(subjectId, req.user.tenantId, filters);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener notas de la materia",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_grades_read")
  @ApiOperation({ summary: "Obtener nota por ID" })
  async findOne(@Request() req, @Param("id") id: string) {
    try {
      const result = await this.service.findOne(id, req.user.tenantId);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener nota",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_grades_write")
  @ApiOperation({ summary: "Actualizar nota (403 si publicada sin permiso edu_grades_publish)" })
  async update(@Request() req, @Param("id") id: string, @Body() dto: UpdateGradeDto) {
    try {
      const permissions: string[] = req.user.role?.permissions ?? [];
      const result = await this.service.update(id, req.user.tenantId, dto, req.user.id, permissions);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar nota",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_grades_write")
  @ApiOperation({ summary: "Eliminar nota (soft-delete)" })
  async remove(@Request() req, @Param("id") id: string) {
    try {
      const result = await this.service.remove(id, req.user.tenantId);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || "Error al eliminar nota",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
