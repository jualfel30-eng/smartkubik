import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { MarketingTriggerService } from "./marketing-trigger.service";
import {
  CreateMarketingTriggerDto,
  UpdateMarketingTriggerDto,
  TriggerFilterDto,
} from "../../dto/marketing-trigger.dto";
import { TriggerStatus } from "../../schemas/marketing-trigger.schema";

@ApiTags("Marketing Triggers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("marketing/triggers")
export class MarketingTriggerController {
  constructor(private readonly triggerService: MarketingTriggerService) {}

  @Post()
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Crear un nuevo trigger automatizado" })
  @ApiResponse({ status: 201, description: "Trigger creado exitosamente" })
  async createTrigger(@Body() dto: CreateMarketingTriggerDto, @Request() req) {
    const trigger = await this.triggerService.createTrigger(
      dto,
      req.user.tenantId,
    );
    return {
      success: true,
      message: "Trigger creado exitosamente",
      data: trigger,
    };
  }

  @Get()
  @Permissions("marketing_read")
  @ApiOperation({ summary: "Obtener todos los triggers" })
  async getTriggers(@Query() filters: TriggerFilterDto, @Request() req) {
    const triggers = await this.triggerService.getTriggers(
      req.user.tenantId,
      filters,
    );
    return {
      success: true,
      data: triggers,
    };
  }

  @Get("analytics")
  @Permissions("marketing_read")
  @ApiOperation({ summary: "Obtener analíticas de triggers" })
  async getTriggerAnalytics(@Request() req) {
    const analytics = await this.triggerService.getTriggerAnalytics(
      req.user.tenantId,
    );
    return {
      success: true,
      data: analytics,
    };
  }

  @Get(":id")
  @Permissions("marketing_read")
  @ApiOperation({ summary: "Obtener un trigger específico" })
  async getTrigger(@Param("id") id: string, @Request() req) {
    const trigger = await this.triggerService.getTrigger(id, req.user.tenantId);
    return {
      success: true,
      data: trigger,
    };
  }

  @Get(":id/executions")
  @Permissions("marketing_read")
  @ApiOperation({ summary: "Obtener historial de ejecuciones del trigger" })
  async getExecutionLogs(
    @Param("id") id: string,
    @Query("limit") limit: number = 50,
    @Request() req,
  ) {
    const logs = await this.triggerService.getExecutionLogs(
      id,
      req.user.tenantId,
      limit,
    );
    return {
      success: true,
      data: logs,
    };
  }

  @Put(":id")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Actualizar un trigger" })
  async updateTrigger(
    @Param("id") id: string,
    @Body() dto: UpdateMarketingTriggerDto,
    @Request() req,
  ) {
    const trigger = await this.triggerService.updateTrigger(
      id,
      dto,
      req.user.tenantId,
    );
    return {
      success: true,
      message: "Trigger actualizado exitosamente",
      data: trigger,
    };
  }

  @Put(":id/activate")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Activar un trigger" })
  async activateTrigger(@Param("id") id: string, @Request() req) {
    const trigger = await this.triggerService.toggleTriggerStatus(
      id,
      req.user.tenantId,
      TriggerStatus.ACTIVE,
    );
    return {
      success: true,
      message: "Trigger activado",
      data: trigger,
    };
  }

  @Put(":id/pause")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Pausar un trigger" })
  async pauseTrigger(@Param("id") id: string, @Request() req) {
    const trigger = await this.triggerService.toggleTriggerStatus(
      id,
      req.user.tenantId,
      TriggerStatus.PAUSED,
    );
    return {
      success: true,
      message: "Trigger pausado",
      data: trigger,
    };
  }

  @Delete(":id")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Eliminar un trigger" })
  async deleteTrigger(@Param("id") id: string, @Request() req) {
    await this.triggerService.deleteTrigger(id, req.user.tenantId);
    return {
      success: true,
      message: "Trigger eliminado exitosamente",
    };
  }
}
