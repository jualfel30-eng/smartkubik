import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../guards/module-access.guard';
import { RequireModule } from '../../decorators/require-module.decorator';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  AppointmentFilterDto,
  CheckAvailabilityDto,
} from './dto/appointment.dto';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva cita' })
  @ApiResponse({ status: 201, description: 'Cita creada exitosamente' })
  @ApiResponse({ status: 409, description: 'Conflicto de horario' })
  create(@Request() req, @Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.create(
      req.user.tenantId,
      createAppointmentDto,
      req.user.userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las citas con filtros opcionales' })
  @ApiResponse({ status: 200, description: 'Lista de citas' })
  findAll(@Request() req, @Query() filters: AppointmentFilterDto) {
    return this.appointmentsService.findAll(req.user.tenantId, filters);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Obtener citas para vista de calendario' })
  @ApiResponse({ status: 200, description: 'Citas en el rango de fechas especificado' })
  getCalendarView(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('resourceId') resourceId?: string,
  ) {
    return this.appointmentsService.getCalendarView(
      req.user.tenantId,
      startDate,
      endDate,
      resourceId,
    );
  }

  @Post('check-availability')
  @ApiOperation({ summary: 'Verificar slots disponibles para un servicio en una fecha' })
  @ApiResponse({ status: 200, description: 'Slots disponibles' })
  checkAvailability(@Request() req, @Body() checkAvailabilityDto: CheckAvailabilityDto) {
    return this.appointmentsService.getAvailableSlots(req.user.tenantId, checkAvailabilityDto);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Obtener estadísticas de citas' })
  @ApiResponse({ status: 200, description: 'Estadísticas calculadas' })
  getStatistics(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.appointmentsService.getStatistics(req.user.tenantId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una cita por ID' })
  @ApiResponse({ status: 200, description: 'Cita encontrada' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.appointmentsService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una cita' })
  @ApiResponse({ status: 200, description: 'Cita actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  @ApiResponse({ status: 409, description: 'Conflicto de horario' })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(
      req.user.tenantId,
      id,
      updateAppointmentDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una cita' })
  @ApiResponse({ status: 200, description: 'Cita eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  remove(@Request() req, @Param('id') id: string) {
    return this.appointmentsService.remove(req.user.tenantId, id);
  }
}
