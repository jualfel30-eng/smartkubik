import {
  Controller, Get, Patch, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { RestaurantOrdersService } from '../services/restaurant-orders.service';
import { UpdateOrderStatusDto } from '../dto/restaurant-order.dto';
import { Body } from '@nestjs/common';

@ApiTags('Restaurant - Orders (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant-orders')
export class RestaurantOrdersController {
  constructor(private readonly ordersService: RestaurantOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos del tenant (admin)' })
  async findAll(
    @Request() req,
    @Query('status') status?: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.ordersService.findAll(req.user.tenantId, {
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener pedido por ID (admin)' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.ordersService.findOne(id, req.user.tenantId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado del pedido' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req,
  ) {
    return this.ordersService.updateStatus(id, dto, req.user.tenantId);
  }
}
