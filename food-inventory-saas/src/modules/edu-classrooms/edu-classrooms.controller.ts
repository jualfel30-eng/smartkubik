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
import { EduClassroomsService } from "./edu-classrooms.service";
import { CreateClassroomDto } from "./dto/create-classroom.dto";
import { UpdateClassroomDto } from "./dto/update-classroom.dto";
import { ClassroomFiltersDto } from "./dto/classroom-filters.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("education-classrooms")
@Controller("education/classrooms")
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class EduClassroomsController {
  constructor(private readonly service: EduClassroomsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_classrooms_write")
  @ApiOperation({ summary: "Crear salón" })
  async create(@Request() req, @Body() dto: CreateClassroomDto) {
    try {
      const result = await this.service.create(dto, req.user.tenantId, req.user.id);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear salón",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_classrooms_read")
  @ApiOperation({ summary: "Listar salones" })
  async findAll(@Request() req, @Query() filters: ClassroomFiltersDto) {
    try {
      const result = await this.service.findAll(req.user.tenantId, filters);
      return { success: true, ...result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al listar salones",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_classrooms_read")
  @ApiOperation({ summary: "Obtener salón por ID" })
  async findOne(@Request() req, @Param("id") id: string) {
    try {
      const result = await this.service.findOne(id, req.user.tenantId);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener salón",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_classrooms_write")
  @ApiOperation({ summary: "Actualizar salón" })
  async update(@Request() req, @Param("id") id: string, @Body() dto: UpdateClassroomDto) {
    try {
      const result = await this.service.update(id, req.user.tenantId, dto);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar salón",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_classrooms_write")
  @ApiOperation({ summary: "Eliminar salón (soft-delete)" })
  async remove(@Request() req, @Param("id") id: string) {
    try {
      const result = await this.service.remove(id, req.user.tenantId);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || "Error al eliminar salón",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(":id/students")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_classrooms_write")
  @ApiOperation({ summary: "Asignar alumnos a un salón" })
  async assignStudents(
    @Request() req,
    @Param("id") id: string,
    @Body() body: { studentIds: string[] },
  ) {
    try {
      const result = await this.service.assignStudents(
        req.user.tenantId,
        id,
        body.studentIds,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al asignar alumnos",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
