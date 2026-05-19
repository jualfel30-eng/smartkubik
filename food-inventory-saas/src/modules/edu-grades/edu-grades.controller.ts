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
  @Permissions("edu_grades_create")
  @ApiOperation({ summary: "Crear nota" })
  async create(@Request() req, @Body() dto: CreateGradeDto) {
    try {
      const result = await this.service.create(dto, req.user.tenantId, req.user.id);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear nota",
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
  @Permissions("edu_grades_update")
  @ApiOperation({ summary: "Actualizar nota" })
  async update(@Request() req, @Param("id") id: string, @Body() dto: UpdateGradeDto) {
    try {
      const result = await this.service.update(id, req.user.tenantId, dto);
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
  @Permissions("edu_grades_delete")
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
