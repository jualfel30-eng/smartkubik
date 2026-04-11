import { Controller, Post, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Public } from '../../../decorators/public.decorator';
import { RestaurantOrdersService } from '../services/restaurant-orders.service';
import { CreateRestaurantOrderDto } from '../dto/restaurant-order.dto';

@ApiTags('Restaurant - Public')
@Controller('public/restaurant')
export class RestaurantOrdersPublicController {
  constructor(private readonly ordersService: RestaurantOrdersService) {}

  @Public()
  @Post(':tenantId/orders')
  @ApiOperation({ summary: 'Crear pedido (público — desde el storefront)' })
  @ApiParam({ name: 'tenantId', description: 'ID del tenant restaurante' })
  async createOrder(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateRestaurantOrderDto,
  ) {
    return this.ordersService.create(dto, tenantId);
  }

  @Public()
  @Patch(':tenantId/orders/:orderId/whatsapp-sent')
  @ApiOperation({ summary: 'Marcar que el pedido fue enviado por WhatsApp (público)' })
  async markWhatsAppSent(
    @Param('tenantId') tenantId: string,
    @Param('orderId') orderId: string,
  ) {
    await this.ordersService.markWhatsAppSent(orderId, tenantId);
    return { success: true };
  }
}
