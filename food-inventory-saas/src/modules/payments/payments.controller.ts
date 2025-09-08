import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { AddOrderPaymentDto, ConfirmOrderPaymentDto } from '../../dto/order.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../decorators/permissions.decorator';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('add')
  @RequirePermissions('orders', ['update'])
  @ApiOperation({ summary: 'Agregar pago a una orden' })
  @ApiResponse({ status: 201, description: 'Pago agregado exitosamente' })
  async addPayment(@Body() addPaymentDto: AddOrderPaymentDto, @Request() req) {
    try {
      const result = await this.paymentsService.addPayment(addPaymentDto, req.user);
      return {
        success: true,
        message: 'Pago agregado exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al agregar pago',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('confirm')
  @RequirePermissions('orders', ['update'])
  @ApiOperation({ summary: 'Confirmar pago de una orden' })
  @ApiResponse({ status: 200, description: 'Pago confirmado exitosamente' })
  async confirmPayment(@Body() confirmPaymentDto: ConfirmOrderPaymentDto, @Request() req) {
    try {
      const result = await this.paymentsService.confirmPayment(confirmPaymentDto, req.user);
      return {
        success: true,
        message: 'Pago confirmado exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al confirmar pago',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('methods')
  @RequirePermissions('orders', ['read'])
  @ApiOperation({ summary: 'Obtener métodos de pago disponibles' })
  @ApiResponse({ status: 200, description: 'Métodos obtenidos exitosamente' })
  async getPaymentMethods(@Request() req) {
    try {
      const methods = await this.paymentsService.getPaymentMethods(req.tenant);
      return {
        success: true,
        message: 'Métodos obtenidos exitosamente',
        data: methods,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener métodos de pago',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

