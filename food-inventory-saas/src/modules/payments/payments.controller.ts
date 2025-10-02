import { Controller, Post, Body, Get, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from '../../dto/payment.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async create(@Body() dto: CreatePaymentDto, @Req() req: any) {
    try {
      const payment = await this.paymentsService.create(dto, req.user);
      return {
        success: true,
        message: 'Pago registrado exitosamente',
        data: payment,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al registrar el pago',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(@Req() req: any) {
    try {
        const payments = await this.paymentsService.findAll(req.user.tenantId);
        return {
            success: true,
            message: 'Pagos obtenidos exitosamente',
            data: payments,
        };
    } catch (error) {
        throw new HttpException(
            error.message || 'Error al obtener los pagos',
            error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
  }
}