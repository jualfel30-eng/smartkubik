import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BeautyBookingsService } from '../services/beauty-bookings.service';
import {
  CreateBeautyBookingDto,
  GetAvailabilityDto,
} from '../../../dto/beauty';
import { Public } from '../../../decorators/public.decorator';
import { WebPushService } from '../../notification-center/web-push.service';

@ApiTags('Beauty Bookings (Public)')
@Public()
@Controller('public/beauty-bookings')
export class BeautyBookingsPublicController {
  constructor(
    private readonly beautyBookingsService: BeautyBookingsService,
    private readonly webPushService: WebPushService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear reserva (público - storefront)' })
  async create(@Body() dto: CreateBeautyBookingDto) {
    return this.beautyBookingsService.create(dto);
  }

  @Post('availability')
  @ApiOperation({
    summary: 'Obtener horarios disponibles para fecha y servicios (público)',
  })
  async getAvailability(@Body() dto: GetAvailabilityDto) {
    return this.beautyBookingsService.getAvailability(dto);
  }

  @Get('booking-number/:bookingNumber')
  @ApiOperation({ summary: 'Buscar reserva por número (público)' })
  async findByBookingNumber(@Param('bookingNumber') bookingNumber: string) {
    return this.beautyBookingsService.findByBookingNumber(bookingNumber);
  }

  /**
   * Check-in de cliente por QR.
   * GET /public/beauty-bookings/checkin?tenantId=xxx&phone=+58...
   * Marca la cita de hoy (primer match activo) con checkedInAt = ahora.
   * Dispara push notification al equipo del salón.
   */
  @Get('client-status')
  @ApiOperation({ summary: 'Verificar si cliente puede reservar (política no-shows)' })
  async getClientStatus(
    @Query('tenantId') tenantId: string,
    @Query('phone') phone: string,
  ) {
    if (!tenantId || !phone) {
      return { canBook: true, requiresDeposit: false, depositAmount: 0 };
    }
    return this.beautyBookingsService.getClientNoShowStatus(tenantId, phone);
  }

  @Get('checkin')
  @ApiOperation({ summary: 'Check-in cliente vía QR (público)' })
  async checkin(
    @Query('tenantId') tenantId: string,
    @Query('phone') phone: string,
  ) {
    if (!tenantId || !phone) {
      throw new NotFoundException('tenantId y phone son requeridos');
    }

    const today = new Date().toISOString().slice(0, 10);
    const bookings = await this.beautyBookingsService.findAll(tenantId, {
      date: today,
      clientPhone: phone,
    });

    const active = bookings.find(
      (b) => b.status === 'confirmed' || b.status === 'pending',
    );

    if (!active) {
      return {
        success: false,
        message: 'No se encontró una cita activa para hoy con ese teléfono.',
      };
    }

    // Mark as checked in
    await this.beautyBookingsService.updateStatus(
      String(active._id),
      { checkedInAt: new Date() } as any,
      tenantId,
      'checkin-qr',
    );

    // Push notification to salon team
    try {
      await this.webPushService.sendToTenant(tenantId, {
        title: '📍 Cliente llegó',
        body: `${active.client?.name || 'Cliente'} está en recepción · ${active.services?.map((s) => s.name).join(', ')}`,
        url: '/appointments',
      });
    } catch (_) {}

    return {
      success: true,
      message: `¡Bienvenido/a, ${active.client?.name || 'cliente'}! Tu cita está confirmada.`,
      bookingNumber: active.bookingNumber,
      startTime: active.startTime,
    };
  }
}
