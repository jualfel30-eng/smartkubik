import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { EduTuitionService } from "./edu-tuition.service";
import { CreateTuitionDto } from "./dto/create-tuition.dto";
import { GenerateTuitionDto } from "./dto/generate-tuition.dto";
import { PayTuitionDto } from "./dto/pay-tuition.dto";
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

  // ─── Rutas estáticas (ANTES de /:id para evitar conflictos de routing) ────

  @Post("generate")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_tuition_write")
  @ApiOperation({ summary: "Generar cuotas mensuales en batch para todos los alumnos activos" })
  async generate(@Request() req, @Body() dto: GenerateTuitionDto) {
    try {
      return await this.service.generateTuitionBatch(dto, req.user.tenantId, req.user.id);
    } catch (error) {
      throw new HttpException(
        error.message || "Error al generar cuotas",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("overdue")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_tuition_read")
  @ApiOperation({ summary: "Listar alumnos morosos con deuda total consolidada" })
  async getOverdue(@Request() req) {
    try {
      const data = await this.service.getOverdue(req.user.tenantId);
      return { success: true, data };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener morosos",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("student/:studentId")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_tuition_read")
  @ApiOperation({ summary: "Obtener cuotas de un alumno específico (portal estudiantil)" })
  async getByStudent(@Request() req, @Param("studentId") studentId: string) {
    try {
      const data = await this.service.getByStudent(studentId, req.user.tenantId);
      return { success: true, data };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener cuotas del alumno",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── CRUD base ────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions("edu_tuition_write")
  @ApiOperation({ summary: "Crear cuota de pensión manualmente" })
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
  @ApiOperation({ summary: "Listar cuotas de pensión con filtros" })
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
  @Permissions("edu_tuition_write")
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
  @Permissions("edu_tuition_write")
  @ApiOperation({ summary: "Eliminar cuota (soft-delete)" })
  async remove(@Request() req, @Param("id") id: string) {
    try {
      return await this.service.remove(id, req.user.tenantId);
    } catch (error) {
      throw new HttpException(
        error.message || "Error al eliminar cuota",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Acciones sobre cuota ─────────────────────────────────────────────────

  @Post(":id/pay")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_tuition_write")
  @ApiOperation({ summary: "Registrar pago manual de una cuota" })
  async pay(@Request() req, @Param("id") id: string, @Body() dto: PayTuitionDto) {
    try {
      return await this.service.payManual(id, req.user.tenantId, dto, req.user.id);
    } catch (error) {
      throw new HttpException(
        error.message || "Error al registrar pago",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(":id/waive")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_tuition_write")
  @ApiOperation({ summary: "Exonerar una cuota (pendiente u overdue)" })
  async waive(@Request() req, @Param("id") id: string) {
    try {
      return await this.service.waive(id, req.user.tenantId);
    } catch (error) {
      throw new HttpException(
        error.message || "Error al exonerar cuota",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(":id/notify")
  @UseGuards(PermissionsGuard)
  @Permissions("edu_tuition_write")
  @ApiOperation({ summary: "Enviar recordatorio de cuota por WhatsApp al representante" })
  async notify(@Request() req, @Param("id") id: string) {
    try {
      return await this.service.notifyManual(id, req.user.tenantId);
    } catch (error) {
      throw new HttpException(
        error.message || "Error al enviar recordatorio",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
