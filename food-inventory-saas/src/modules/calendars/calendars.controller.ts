import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { CalendarsService } from "./calendars.service";
import {
  CreateCalendarDto,
  UpdateCalendarDto,
  SyncCalendarToGoogleDto,
} from "../../dto/calendar.dto";

@ApiTags("calendars")
@Controller("calendars")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Post()
  @ApiOperation({ summary: "Crear un nuevo calendario" })
  async create(@Body() createCalendarDto: CreateCalendarDto, @Request() req) {
    const calendar = await this.calendarsService.create(createCalendarDto, req.user);
    return {
      success: true,
      data: calendar,
      message: "Calendario creado exitosamente",
    };
  }

  @Get()
  @ApiOperation({ summary: "Obtener todos los calendarios visibles para el usuario" })
  async findAll(@Request() req) {
    const calendars = await this.calendarsService.findAll(req.user);
    return {
      success: true,
      data: calendars,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener un calendario por ID" })
  async findOne(@Param("id") id: string, @Request() req) {
    const calendar = await this.calendarsService.findOne(id, req.user);
    return {
      success: true,
      data: calendar,
    };
  }

  @Put(":id")
  @ApiOperation({ summary: "Actualizar un calendario" })
  async update(
    @Param("id") id: string,
    @Body() updateCalendarDto: UpdateCalendarDto,
    @Request() req,
  ) {
    const calendar = await this.calendarsService.update(id, updateCalendarDto, req.user);
    return {
      success: true,
      data: calendar,
      message: "Calendario actualizado exitosamente",
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Eliminar un calendario" })
  async remove(@Param("id") id: string, @Request() req) {
    await this.calendarsService.remove(id, req.user);
    return {
      success: true,
      message: "Calendario eliminado exitosamente",
    };
  }

  @Post(":id/sync-google")
  @ApiOperation({ summary: "Sincronizar calendario con Google Calendar" })
  async syncToGoogle(@Param("id") id: string, @Request() req) {
    const result = await this.calendarsService.syncCalendarToGoogle(id, req.user);
    return {
      success: true,
      data: result,
    };
  }

  @Post("sync-all-google")
  @ApiOperation({ summary: "Sincronizar todos los calendarios del usuario con Google" })
  async syncAllToGoogle(@Request() req) {
    const calendars = await this.calendarsService.findAll(req.user);
    const results = [];

    for (const calendar of calendars) {
      if (calendar.canEdit && !calendar.googleSync?.enabled) {
        try {
          const result = await this.calendarsService.syncCalendarToGoogle(
            calendar.id,
            req.user,
          );
          results.push({ calendarId: calendar.id, ...result });
        } catch (error) {
          results.push({
            calendarId: calendar.id,
            success: false,
            error: error.message,
          });
        }
      }
    }

    return {
      success: true,
      data: results,
      message: `Sincronización completada: ${results.filter((r) => r.success).length}/${results.length} calendarios`,
    };
  }

  @Post(":id/setup-watch")
  @ApiOperation({
    summary: "Configurar sincronización bidireccional (solo admin)",
  })
  async setupWatchChannel(@Param("id") id: string, @Request() req) {
    // Construir la URL del webhook
    const apiBaseUrl =
      process.env.API_BASE_URL || "http://localhost:3000";
    const webhookUrl = `${apiBaseUrl}/api/v1/calendars/google-webhook`;

    const calendar = await this.calendarsService.setupWatchChannel(
      id,
      req.user,
      webhookUrl,
    );

    return {
      success: true,
      data: calendar,
      message:
        "Sincronización bidireccional configurada. Los cambios en Google se reflejarán automáticamente.",
    };
  }

  @Post(":id/sync-from-google")
  @ApiOperation({
    summary: "Sincronizar eventos desde Google Calendar hacia el ERP",
  })
  async syncFromGoogle(@Param("id") id: string, @Request() req) {
    const result = await this.calendarsService.syncEventsFromGoogle(
      id,
      req.user,
    );

    return {
      success: true,
      data: result,
      message: `Sincronización completada: ${result.synced} eventos sincronizados, ${result.errors} errores`,
    };
  }

  @Post("google-webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Webhook para recibir notificaciones de Google Calendar",
  })
  async googleWebhook(@Request() req) {
    // Google Calendar envía notificaciones cuando hay cambios
    const channelId = req.headers["x-goog-channel-id"];
    const resourceId = req.headers["x-goog-resource-id"];
    const resourceState = req.headers["x-goog-resource-state"];
    const channelToken = req.headers["x-goog-channel-token"];

    // Buscar el calendario asociado a este watch channel
    const calendar = await this.calendarsService.findAll(req.user);
    const targetCalendar = calendar.find(
      (c) =>
        c.googleSync?.watchChannel?.id === channelId &&
        c.googleSync?.watchChannel?.token === channelToken,
    );

    if (!targetCalendar) {
      // No se encontró el calendario, posiblemente un canal antiguo
      return { success: false, message: "Canal no reconocido" };
    }

    // Si el estado es "sync", es solo una verificación inicial
    if (resourceState === "sync") {
      return {
        success: true,
        message: "Webhook verificado",
      };
    }

    // Si hay cambios reales ("exists"), sincronizar
    if (resourceState === "exists") {
      try {
        await this.calendarsService.syncEventsFromGoogle(
          targetCalendar.id,
          req.user,
        );
        return {
          success: true,
          message: "Eventos sincronizados automáticamente",
        };
      } catch (error) {
        return {
          success: false,
          message: `Error en sincronización automática: ${error.message}`,
        };
      }
    }

    return { success: true };
  }
}
