import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { OpportunitiesService } from "./opportunities.service";
import {
  ChangeStageDto,
  CreateOpportunityDto,
  OpportunityQueryDto,
  UpdateOpportunityDto,
  MqlDecisionDto,
  SqlDecisionDto,
  BulkCaptureDto,
} from "../../dto/opportunity.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("opportunities")
@Controller("opportunities")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Post()
  @Permissions("customers_create")
  @ApiOperation({ summary: "Crear oportunidad" })
  async create(@Body() dto: CreateOpportunityDto, @Request() req) {
    try {
      const data = await this.opportunitiesService.create(dto, req.user);
      return { success: true, data };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear oportunidad",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Permissions("customers_read")
  @ApiOperation({ summary: "Listar oportunidades" })
  async findAll(@Query() query: OpportunityQueryDto, @Request() req) {
    try {
      const data = await this.opportunitiesService.findAll(
        query,
        req.user.tenantId,
      );
      return { success: true, data };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al listar oportunidades",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  @Permissions("customers_read")
  @ApiOperation({ summary: "Obtener oportunidad" })
  async findOne(@Param("id") id: string, @Request() req) {
    const data = await this.opportunitiesService.findOne(id, req.user.tenantId);
    return { success: true, data };
  }

  @Patch(":id")
  @Permissions("customers_update")
  @ApiOperation({ summary: "Actualizar oportunidad" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateOpportunityDto,
    @Request() req,
  ) {
    try {
      const data = await this.opportunitiesService.update(id, dto, req.user);
      return { success: true, data };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar oportunidad",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(":id/stage")
  @Permissions("customers_update")
  @ApiOperation({ summary: "Cambiar etapa de oportunidad" })
  async changeStage(
    @Param("id") id: string,
    @Body() dto: ChangeStageDto,
    @Request() req,
  ) {
    try {
      const data = await this.opportunitiesService.changeStage(
        id,
        dto,
        req.user,
      );
      return { success: true, data };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al cambiar etapa",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("/summary")
  @Permissions("customers_read")
  @ApiOperation({ summary: "Resumen rápido de oportunidades" })
  async summary(@Request() req) {
    const data = await this.opportunitiesService.summary(req.user.tenantId);
    return { success: true, data };
  }

  @Patch(":id/mql")
  @Permissions("customers_update")
  @ApiOperation({ summary: "Decisión MQL (aceptar/rechazar)" })
  async decideMql(
    @Param("id") id: string,
    @Body() dto: MqlDecisionDto,
    @Request() req,
  ) {
    const data = await this.opportunitiesService.markMql(id, dto, req.user);
    return { success: true, data };
  }

  @Patch(":id/sql")
  @Permissions("customers_update")
  @ApiOperation({ summary: "Decisión SQL (aceptar/rechazar)" })
  async decideSql(
    @Param("id") id: string,
    @Body() dto: SqlDecisionDto,
    @Request() req,
  ) {
    const data = await this.opportunitiesService.markSql(id, dto, req.user);
    return { success: true, data };
  }

  @Post("/capture/form")
  @Permissions("customers_create")
  @ApiOperation({ summary: "Captura de oportunidad desde formulario/UTM" })
  async captureFromForm(@Body() dto: CreateOpportunityDto, @Request() req) {
    const data = await this.opportunitiesService.captureFromForm(dto, req.user);
    return { success: true, data };
  }

  @Post("/capture/bulk")
  @Permissions("customers_create")
  @ApiOperation({ summary: "Captura masiva (CSV/Ads/LinkedIn/Chat/API)" })
  async captureBulk(@Body() dto: BulkCaptureDto, @Request() req) {
    const data = await this.opportunitiesService.captureBulk(dto, req.user);
    return { success: true, data };
  }

  @Get(":id/messages")
  @Permissions("customers_read")
  @ApiOperation({ summary: "Listar mensajes/actividades de una oportunidad" })
  async listMessages(
    @Param("id") id: string,
    @Query("threadId") threadId: string,
    @Request() req,
  ) {
    const data = await this.opportunitiesService.listMessageActivities(id, threadId, req.user.tenantId);
    return { success: true, data };
  }

  @Post(":id/email-activity")
  @Permissions("customers_update")
  @ApiOperation({ summary: "Registrar actividad de email (in/out)" })
  async logEmailActivity(
    @Param("id") id: string,
    @Body()
    payload: {
      direction: "inbound" | "outbound";
      subject?: string;
      body?: string;
      from?: string;
      to?: string[];
      messageId?: string;
      threadId?: string;
      channel?: string;
      language?: string;
      eventId?: string;
    },
    @Request() req,
  ) {
    const data = await this.opportunitiesService.logEmailActivity(id, payload, req.user);
    return { success: true, data };
  }

  @Post(":id/calendar-activity")
  @Permissions("customers_update")
  @ApiOperation({ summary: "Registrar reunión/evento de calendario" })
  async logCalendarActivity(
    @Param("id") id: string,
    @Body()
    payload: {
      subject: string;
      startAt: string;
      endAt?: string;
      attendees?: string[];
      threadId?: string;
    },
    @Request() req,
  ) {
    const data = await this.opportunitiesService.logCalendarActivity(id, payload, req.user);
    return { success: true, data };
  }
}
