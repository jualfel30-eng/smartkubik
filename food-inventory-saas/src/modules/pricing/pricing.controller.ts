import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { OrderCalculationDto } from '../../dto/order.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../decorators/permissions.decorator';

@ApiTags('pricing')
@Controller('pricing')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('calculate')
  @RequirePermissions('orders', ['read'])
  @ApiOperation({ summary: 'Calcular precios de orden con impuestos venezolanos' })
  @ApiResponse({ status: 200, description: 'Cálculo realizado exitosamente' })
  async calculateOrder(@Body() calculationDto: OrderCalculationDto, @Request() req) {
    try {
      const calculation = await this.pricingService.calculateOrder(calculationDto, req.tenant);
      return {
        success: true,
        message: 'Cálculo realizado exitosamente',
        data: calculation,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al calcular precios',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

