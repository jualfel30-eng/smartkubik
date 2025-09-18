import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { EventsService } from "./events.service";
import { CreateEventDto, UpdateEventDto } from "../../dto/event.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { RequirePermissions } from "../../decorators/permissions.decorator";

@ApiTags("Calendar Events")
@Controller("events")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @RequirePermissions("calendar", ["create"])
  @ApiOperation({ summary: "Crear un nuevo evento en el calendario" })
  @ApiResponse({
    status: 201,
    description: "El evento ha sido creado exitosamente.",
  })
  async create(@Body() createEventDto: CreateEventDto, @Request() req) {
    try {
      const event = await this.eventsService.create(createEventDto, req.user);
      return { success: true, data: event };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @RequirePermissions("calendar", ["read"])
  @ApiOperation({ summary: "Obtener todos los eventos para el tenant" })
  @ApiQuery({
    name: "start",
    required: false,
    description: "Fecha de inicio para filtrar eventos (ISO 8601)",
  })
  @ApiQuery({
    name: "end",
    required: false,
    description: "Fecha de fin para filtrar eventos (ISO 8601)",
  })
  @ApiResponse({ status: 200, description: "Lista de eventos." })
  async findAll(
    @Request() req,
    @Query("start") start?: string,
    @Query("end") end?: string,
  ) {
    try {
      const events = await this.eventsService.findAll(req.user, start, end);
      return { success: true, data: events };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(":id")
  @RequirePermissions("calendar", ["update"])
  @ApiOperation({ summary: "Actualizar un evento existente" })
  @ApiResponse({ status: 200, description: "El evento ha sido actualizado." })
  async update(
    @Param("id") id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req,
  ) {
    try {
      const event = await this.eventsService.update(
        id,
        updateEventDto,
        req.user,
      );
      return { success: true, data: event };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(":id")
  @RequirePermissions("calendar", ["delete"])
  @ApiOperation({ summary: "Eliminar un evento" })
  @ApiResponse({ status: 200, description: "El evento ha sido eliminado." })
  async remove(@Param("id") id: string, @Request() req) {
    try {
      const result = await this.eventsService.remove(id, req.user);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
