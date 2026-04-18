import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TenantGuard } from '../../../guards/tenant.guard';
import { BeautyBookingsService } from '../services/beauty-bookings.service';
import { BeautyWhatsAppNotificationsService } from '../services/beauty-whatsapp-notifications.service';
import { UpdateBookingStatusDto, AdminCreateBeautyBookingDto, UpdateBeautyBookingDto } from '../../../dto/beauty';

@ApiTags('Beauty Bookings (Private)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('beauty-bookings')
export class BeautyBookingsController {
  constructor(
    private readonly beautyBookingsService: BeautyBookingsService,
    private readonly whatsappService: BeautyWhatsAppNotificationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear reserva desde panel admin' })
  async create(@Body() dto: AdminCreateBeautyBookingDto, @Request() req) {
    // Convertir al formato completo que espera el servicio
    const fullDto = {
      tenantId: req.user.tenantId,
      client: {
        name: dto.client.name,
        // Teléfono requerido por el schema; placeholder si admin no tiene el dato
        phone: dto.client.phone || '+10000000000',
        email: dto.client.email,
      },
      professionalId: dto.professionalId || undefined,
      services: dto.services,
      date: dto.date,
      startTime: dto.startTime,
      notes: dto.notes,
      locationId: dto.locationId,
      recurrenceRule: dto.recurrenceRule,
      // Admin bookings (walk-ins) skip availability validation — client is already present
      skipAvailabilityCheck: true,
    };
    return this.beautyBookingsService.create(fullDto as any);
  }

  @Get()
  // @Permissions('beauty_bookings_read')
  @ApiOperation({ summary: 'Obtener todas las reservas' })
  async findAll(
    @Request() req,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('professionalId') professionalId?: string,
    @Query('clientPhone') clientPhone?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.beautyBookingsService.findAll(req.user.tenantId, {
      date,
      startDate,
      endDate,
      status,
      professionalId,
      clientPhone,
      locationId,
    });
  }

  @Post('waitlist')
  @ApiOperation({ summary: 'Agregar cliente a lista de espera' })
  async addToWaitlist(@Body() dto: any, @Request() req) {
    return this.beautyBookingsService.addToWaitlist({
      ...dto,
      tenantId: req.user.tenantId,
    });
  }

  @Get('waitlist')
  @ApiOperation({ summary: 'Obtener lista de espera del día' })
  async getWaitlist(@Query('date') date: string, @Request() req) {
    return this.beautyBookingsService.getWaitlist(req.user.tenantId, date);
  }

  @Delete('series/:seriesId')
  @ApiOperation({ summary: 'Cancelar todas las citas futuras de una serie' })
  async cancelSeries(
    @Param('seriesId') seriesId: string,
    @Request() req,
  ) {
    return this.beautyBookingsService.cancelSeries(
      seriesId,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Get(':id')
  // @Permissions('beauty_bookings_read')
  @ApiOperation({ summary: 'Obtener reserva por ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.beautyBookingsService.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Reagendar reserva (cambiar fecha, hora, profesional o notas)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBeautyBookingDto,
    @Request() req,
  ) {
    return this.beautyBookingsService.update(id, dto, req.user.tenantId, req.user.userId);
  }

  @Patch(':id/status')
  // @Permissions('beauty_bookings_update')
  @ApiOperation({ summary: 'Actualizar estado de reserva' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @Request() req,
  ) {
    return this.beautyBookingsService.updateStatus(
      id,
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Post(':id/notify')
  // @Permissions('beauty_bookings_notify')
  @ApiOperation({
    summary: 'Enviar notificación WhatsApp manualmente',
    description:
      'Permite al admin enviar o reenviar notificaciones WhatsApp. Tipos: confirmation, reminder, cancellation',
  })
  async sendNotification(
    @Param('id') id: string,
    @Body('type') type: 'confirmation' | 'reminder' | 'cancellation',
    @Request() req,
  ) {
    if (!type || !['confirmation', 'reminder', 'cancellation'].includes(type)) {
      throw new BadRequestException(
        'Type must be: confirmation, reminder, or cancellation',
      );
    }

    const booking = await this.beautyBookingsService.findOne(
      id,
      req.user.tenantId,
    );

    let result: { success: boolean; error?: string };

    switch (type) {
      case 'confirmation':
        result = await this.whatsappService.sendConfirmationNotification(
          booking,
        );
        break;
      case 'reminder':
        result = await this.whatsappService.sendReminderNotification(booking);
        break;
      case 'cancellation':
        result = await this.whatsappService.sendCancellationNotification(
          booking,
        );
        break;
    }

    return {
      success: result.success,
      message: result.success
        ? `${type} notification sent successfully`
        : `Failed to send notification: ${result.error}`,
      bookingNumber: booking.bookingNumber,
      clientPhone: booking.client.phone,
    };
  }

  @Get(':id/whatsapp-link')
  // @Permissions('beauty_bookings_read')
  @ApiOperation({
    summary: 'Obtener link de WhatsApp pre-armado',
    description:
      'Genera link wa.me con mensaje pre-cargado como fallback si la API falla',
  })
  async getWhatsAppLink(
    @Param('id') id: string,
    @Query('type') type: 'confirmation' | 'reminder' | 'cancellation',
    @Request() req,
  ) {
    if (!type || !['confirmation', 'reminder', 'cancellation'].includes(type)) {
      throw new BadRequestException(
        'Type must be: confirmation, reminder, or cancellation',
      );
    }

    const booking = await this.beautyBookingsService.findOne(
      id,
      req.user.tenantId,
    );

    // TODO: Build message based on type
    const message = `Hola ${booking.client.name}, tu reserva ${booking.bookingNumber}...`;

    const link = this.whatsappService.getWhatsAppLink(
      booking.client.phone,
      message,
    );

    return {
      link,
      phone: booking.client.phone,
      bookingNumber: booking.bookingNumber,
    };
  }
}
