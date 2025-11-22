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
import { SchedulingService } from "./scheduling.service";
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  GetSchedulesQueryDto,
} from "../../dto/campaign-schedule.dto";

@ApiTags("Campaign Scheduling")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("marketing/schedules")
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post()
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Crear una programación de campaña" })
  @ApiResponse({ status: 201, description: "Programación creada exitosamente" })
  async createSchedule(@Body() dto: CreateScheduleDto, @Request() req) {
    const schedule = await this.schedulingService.createSchedule(
      dto,
      req.user.tenantId,
    );

    return {
      success: true,
      message: "Programación creada exitosamente",
      data: schedule,
    };
  }

  @Get()
  @Permissions("marketing_read")
  @ApiOperation({ summary: "Obtener todas las programaciones" })
  async getSchedules(@Query() query: GetSchedulesQueryDto, @Request() req) {
    const schedules = await this.schedulingService.getSchedules(
      req.user.tenantId,
      query,
    );

    return {
      success: true,
      data: schedules,
    };
  }

  @Get(":id")
  @Permissions("marketing_read")
  @ApiOperation({ summary: "Obtener una programación por ID" })
  async getSchedule(@Param("id") id: string, @Request() req) {
    const schedule = await this.schedulingService.getSchedule(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      data: schedule,
    };
  }

  @Put(":id")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Actualizar una programación" })
  async updateSchedule(
    @Param("id") id: string,
    @Body() dto: UpdateScheduleDto,
    @Request() req,
  ) {
    const schedule = await this.schedulingService.updateSchedule(
      id,
      dto,
      req.user.tenantId,
    );

    return {
      success: true,
      message: "Programación actualizada",
      data: schedule,
    };
  }

  @Delete(":id")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Eliminar una programación" })
  async deleteSchedule(@Param("id") id: string, @Request() req) {
    await this.schedulingService.deleteSchedule(id, req.user.tenantId);

    return {
      success: true,
      message: "Programación eliminada",
    };
  }

  @Post(":id/pause")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Pausar una programación" })
  async pauseSchedule(@Param("id") id: string, @Request() req) {
    const schedule = await this.schedulingService.pauseSchedule(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      message: "Programación pausada",
      data: schedule,
    };
  }

  @Post(":id/resume")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Reanudar una programación pausada" })
  async resumeSchedule(@Param("id") id: string, @Request() req) {
    const schedule = await this.schedulingService.resumeSchedule(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      message: "Programación reanudada",
      data: schedule,
    };
  }
}
