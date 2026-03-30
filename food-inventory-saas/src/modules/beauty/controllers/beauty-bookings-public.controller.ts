import {
  Controller,
  Get,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BeautyBookingsService } from '../services/beauty-bookings.service';
import {
  CreateBeautyBookingDto,
  GetAvailabilityDto,
} from '../../../dto/beauty';

@ApiTags('Beauty Bookings (Public)')
// @Public()
@Controller('public/beauty-bookings')
export class BeautyBookingsPublicController {
  constructor(
    private readonly beautyBookingsService: BeautyBookingsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear reserva (público - storefront)' })
  async create(@Body() dto: CreateBeautyBookingDto) {
    return this.beautyBookingsService.create(dto);
  }

  @Post('availability')
  @ApiOperation({
    summary: 'Obtener slots disponibles para fecha y servicios (público)',
  })
  async getAvailability(@Body() dto: GetAvailabilityDto) {
    return this.beautyBookingsService.getAvailability(dto);
  }

  @Get('booking-number/:bookingNumber')
  @ApiOperation({ summary: 'Buscar reserva por número (público)' })
  async findByBookingNumber(@Param('bookingNumber') bookingNumber: string) {
    return this.beautyBookingsService.findByBookingNumber(bookingNumber);
  }
}
