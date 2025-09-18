import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from '../../dto/payment.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { Request } from 'express';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto, @Req() req: any) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.paymentsService.create(createPaymentDto, tenantId, userId);
  }

  @Get()
  findAll(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.paymentsService.findAll(tenantId);
  }
}