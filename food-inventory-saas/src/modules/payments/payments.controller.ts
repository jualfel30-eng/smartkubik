import { Controller, Post, Body, Param, UseGuards, Request, Get } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from '../../dto/payment.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';

@Controller('orders') // Listen on /orders route
@UseGuards(JwtAuthGuard, TenantGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('__lookup/payment-methods')
  getPaymentMethods(@Request() req) {
    return this.paymentsService.getPaymentMethods(req.user);
  }

  @Post(':orderId/payments')
  createPaymentForOrder(
    @Param('orderId') orderId: string,
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req,
  ) {
    return this.paymentsService.createPayment(orderId, createPaymentDto, req.user);
  }
}
