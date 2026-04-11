import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Public } from '../../../decorators/public.decorator';
import { RestaurantDishesService } from '../services/restaurant-dishes.service';

@ApiTags('Restaurant - Public')
@Controller('public/restaurant')
export class RestaurantDishesPublicController {
  constructor(private readonly dishesService: RestaurantDishesService) {}

  @Public()
  @Get(':tenantId/menu')
  @ApiOperation({ summary: 'Menú completo: platos disponibles + categorías (público)' })
  @ApiParam({ name: 'tenantId', description: 'ID del tenant restaurante' })
  async getMenu(@Param('tenantId') tenantId: string) {
    return this.dishesService.getPublicMenu(tenantId);
  }

  @Public()
  @Get(':tenantId/dishes')
  @ApiOperation({ summary: 'Platos disponibles del restaurante (público)' })
  async getDishes(
    @Param('tenantId') tenantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.dishesService.findAll(tenantId, {
      onlyAvailable: true,
      categoryId,
      search,
    });
  }

  @Public()
  @Get(':tenantId/dishes/:dishId')
  @ApiOperation({ summary: 'Detalle de un plato (público)' })
  async getDish(@Param('tenantId') tenantId: string, @Param('dishId') dishId: string) {
    return this.dishesService.findOne(dishId, tenantId);
  }
}
