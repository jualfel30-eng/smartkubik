import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { ModuleAccessGuard } from "../../guards/module-access.guard";
import { RequireModule } from "../../decorators/require-module.decorator";
import { AppointmentsService } from "./appointments.service";
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  AppointmentFilterDto,
  CheckAvailabilityDto,
  CreateAppointmentSeriesDto,
  CreateAppointmentGroupDto,
  CreateRoomBlockDto,
  CreateManualDepositDto,
  UpdateManualDepositDto,
} from "./dto/appointment.dto";

@ApiTags("Appointments")
@ApiBearerAuth()
@Controller("appointments")
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule("appointments")
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: "Crear una nueva cita" })
  @ApiResponse({ status: 201, description: "Cita creada exitosamente" })
  @ApiResponse({ status: 409, description: "Conflicto de horario" })
  create(@Request() req, @Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.create(
      req.user.tenantId,
      createAppointmentDto,
      req.user.userId,
    );
  }

  @Post("series")
  @ApiOperation({ summary: "Crear una serie de citas recurrentes o grupales" })
  @ApiResponse({
    status: 201,
    description: "Serie de citas creada exitosamente",
  })
  createSeries(
    @Request() req,
    @Body() createSeriesDto: CreateAppointmentSeriesDto,
  ) {
    return this.appointmentsService.createSeries(
      req.user.tenantId,
      createSeriesDto,
      req.user.userId,
    );
  }

  @Post("group")
  @ApiOperation({
    summary: "Crear un bloque grupal de citas",
    description:
      "Genera múltiples citas sincronizadas para un servicio compartido (tours, clases, experiencias).",
  })
  @ApiResponse({
    status: 201,
    description: "Bloque grupal creado exitosamente",
  })
  async createGroup(
    @Request() req,
    @Body() createGroupDto: CreateAppointmentGroupDto,
  ) {
    return this.appointmentsService.createGroup(
      req.user.tenantId,
      createGroupDto,
      req.user.userId,
    );
  }

  @Post("room-block")
  @ApiOperation({
    summary: "Crear un bloqueo de habitación",
    description:
      "Bloquea un recurso (habitacion/sala) para mantenimiento o tareas especiales, generando una cita interna.",
  })
  @ApiResponse({ status: 201, description: "Bloqueo creado exitosamente" })
  async createRoomBlock(
    @Request() req,
    @Body() createRoomBlockDto: CreateRoomBlockDto,
  ) {
    return this.appointmentsService.createRoomBlock(
      req.user.tenantId,
      createRoomBlockDto,
      req.user.userId,
    );
  }

  @Post(":id/manual-deposits")
  @ApiOperation({
    summary: "Registrar un pago manual/deposito",
    description:
      "Registra un pago recibido de forma manual con referencia y comprobante opcional.",
  })
  async createManualDeposit(
    @Request() req,
    @Param("id") appointmentId: string,
    @Body() createManualDepositDto: CreateManualDepositDto,
  ) {
    return this.appointmentsService.createManualDeposit(
      req.user.tenantId,
      appointmentId,
      createManualDepositDto,
      req.user.userId,
    );
  }

  @Patch(":id/manual-deposits/:depositId")
  @ApiOperation({
    summary: "Confirmar o rechazar un depósito",
  })
  async updateManualDeposit(
    @Request() req,
    @Param("id") appointmentId: string,
    @Param("depositId") depositId: string,
    @Body() updateManualDepositDto: UpdateManualDepositDto,
  ) {
    return this.appointmentsService.updateManualDeposit(
      req.user.tenantId,
      appointmentId,
      depositId,
      updateManualDepositDto,
      req.user.userId,
    );
  }

  @Get(":id/manual-deposits/:depositId/receipt")
  @ApiOperation({ summary: "Obtener comprobante de un depósito confirmado" })
  async getManualDepositReceipt(
    @Request() req,
    @Param("id") appointmentId: string,
    @Param("depositId") depositId: string,
  ) {
    return this.appointmentsService.getDepositReceipt(
      req.user.tenantId,
      appointmentId,
      depositId,
    );
  }

  @Get()
  @ApiOperation({ summary: "Obtener todas las citas con filtros opcionales" })
  @ApiResponse({ status: 200, description: "Lista de citas" })
  findAll(@Request() req, @Query() filters: AppointmentFilterDto) {
    return this.appointmentsService.findAll(req.user.tenantId, filters);
  }

  @Get("deposits/pending")
  @ApiOperation({
    summary: "Listar depósitos manuales pendientes de validar",
  })
  async getPendingDeposits(@Request() req) {
    return this.appointmentsService.getPendingDeposits(req.user.tenantId);
  }

  @Get("calendar")
  @ApiOperation({ summary: "Obtener citas para vista de calendario" })
  @ApiResponse({
    status: 200,
    description: "Citas en el rango de fechas especificado",
  })
  getCalendarView(
    @Request() req,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Query("resourceId") resourceId?: string,
    @Query("locationId") locationId?: string,
  ) {
    return this.appointmentsService.getCalendarView(
      req.user.tenantId,
      startDate,
      endDate,
      resourceId,
      locationId,
    );
  }

  @Post("check-availability")
  @ApiOperation({
    summary: "Verificar slots disponibles para un servicio en una fecha",
  })
  @ApiResponse({ status: 200, description: "Slots disponibles" })
  checkAvailability(
    @Request() req,
    @Body() checkAvailabilityDto: CheckAvailabilityDto,
  ) {
    return this.appointmentsService.getAvailableSlots(
      req.user.tenantId,
      checkAvailabilityDto,
    );
  }

  @Get("statistics")
  @ApiOperation({ summary: "Obtener estadísticas de citas" })
  @ApiResponse({ status: 200, description: "Estadísticas calculadas" })
  getStatistics(
    @Request() req,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    return this.appointmentsService.getStatistics(
      req.user.tenantId,
      startDate,
      endDate,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener una cita por ID" })
  @ApiResponse({ status: 200, description: "Cita encontrada" })
  @ApiResponse({ status: 404, description: "Cita no encontrada" })
  findOne(@Request() req, @Param("id") id: string) {
    return this.appointmentsService.findOne(req.user.tenantId, id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Actualizar una cita" })
  @ApiResponse({ status: 200, description: "Cita actualizada exitosamente" })
  @ApiResponse({ status: 404, description: "Cita no encontrada" })
  @ApiResponse({ status: 409, description: "Conflicto de horario" })
  update(
    @Request() req,
    @Param("id") id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(
      req.user.tenantId,
      id,
      updateAppointmentDto,
      req.user.userId,
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Eliminar una cita" })
  @ApiResponse({ status: 200, description: "Cita eliminada exitosamente" })
  @ApiResponse({ status: 404, description: "Cita no encontrada" })
  remove(@Request() req, @Param("id") id: string) {
    return this.appointmentsService.remove(req.user.tenantId, id);
  }
}
