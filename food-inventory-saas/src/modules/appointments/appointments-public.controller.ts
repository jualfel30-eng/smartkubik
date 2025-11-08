import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { Public } from "../../decorators/public.decorator";
import { AppointmentsService } from "./appointments.service";
import {
  PublicAvailabilityDto,
  PublicCancelAppointmentDto,
  PublicCreateAppointmentDto,
  PublicAppointmentLookupDto,
  PublicRescheduleAppointmentDto,
} from "./dto/public-appointment.dto";

@ApiTags("Appointments Public")
@Controller("api/v1/public/appointments")
export class AppointmentsPublicController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Public()
  @Post("availability")
  @ApiOperation({
    summary: "Consultar disponibilidad pública para un servicio",
    description:
      "Devuelve un listado de slots disponibles considerando recursos, buffers y políticas de capacidad.",
  })
  @ApiResponse({
    status: 200,
    description: "Disponibilidad obtenida correctamente",
  })
  async getAvailability(@Body() payload: PublicAvailabilityDto) {
    const slots = await this.appointmentsService.getPublicAvailability(payload);
    return {
      success: true,
      data: slots,
    };
  }

  @Public()
  @Post()
  @ApiOperation({
    summary: "Crear una reserva desde el portal público",
    description:
      "Crea una cita en nombre del huésped verificando políticas de reserva, capacidad y recursos involucrados.",
  })
  @ApiResponse({
    status: 201,
    description: "Reserva creada exitosamente",
  })
  async create(@Body() payload: PublicCreateAppointmentDto) {
    const result = await this.appointmentsService.createFromPublic(payload);
    return {
      success: true,
      data: result,
    };
  }

  @Public()
  @Post("lookup")
  @ApiOperation({
    summary: "Consultar reservas públicas por huésped",
    description:
      "Permite a un huésped obtener sus próximas reservas usando su correo (y opcionalmente teléfono/código).",
  })
  @ApiResponse({
    status: 200,
    description: "Reservas obtenidas correctamente",
  })
  async lookup(@Body() payload: PublicAppointmentLookupDto) {
    const data = await this.appointmentsService.lookupPublic(payload);
    return {
      success: true,
      data,
    };
  }

  @Public()
  @Post(":id/cancel")
  @ApiOperation({
    summary: "Cancelar una reserva pública",
    description:
      "Permite a un huésped cancelar su reserva utilizando el código seguro entregado al confirmar la cita.",
  })
  @ApiParam({
    name: "id",
    description: "ID de la cita a cancelar",
    example: "64f27c6f2f1e8a0011223344",
  })
  @ApiResponse({
    status: 200,
    description: "Reserva cancelada exitosamente",
  })
  async cancel(
    @Param("id") appointmentId: string,
    @Body() payload: PublicCancelAppointmentDto,
  ) {
    const result = await this.appointmentsService.cancelFromPublic(
      appointmentId,
      payload,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Public()
  @Post(":id/reschedule")
  @ApiOperation({
    summary: "Reprogramar una reserva pública",
    description:
      "Permite a un huésped mover su reserva a un nuevo horario utilizando su código de cancelación.",
  })
  @ApiParam({
    name: "id",
    description: "ID de la cita a reprogramar",
    example: "64f27c6f2f1e8a0011223344",
  })
  @ApiResponse({
    status: 200,
    description: "Reserva reprogramada exitosamente",
  })
  async reschedule(
    @Param("id") appointmentId: string,
    @Body() payload: PublicRescheduleAppointmentDto,
  ) {
    const result = await this.appointmentsService.rescheduleFromPublic(
      appointmentId,
      payload,
    );

    return {
      success: true,
      data: result,
    };
  }
}
