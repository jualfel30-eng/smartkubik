import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { RestaurantDishesService } from '../services/restaurant-dishes.service';
import { CreateRestaurantDishDto, UpdateRestaurantDishDto } from '../dto/restaurant-dish.dto';

@ApiTags('Restaurant - Dishes (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant-dishes')
export class RestaurantDishesController {
  constructor(private readonly dishesService: RestaurantDishesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los platos del tenant (admin)' })
  async findAll(
    @Request() req,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('onlyAvailable') onlyAvailable?: string,
  ) {
    return this.dishesService.findAll(req.user.tenantId, {
      categoryId,
      search,
      onlyAvailable: onlyAvailable === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plato por ID (admin)' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.dishesService.findOne(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear plato' })
  async create(@Body() dto: CreateRestaurantDishDto, @Request() req) {
    return this.dishesService.create(dto, req.user.tenantId, req.user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar plato' })
  async update(@Param('id') id: string, @Body() dto: UpdateRestaurantDishDto, @Request() req) {
    return this.dishesService.update(id, dto, req.user.tenantId);
  }

  @Patch(':id/toggle-availability')
  @ApiOperation({ summary: 'Activar/desactivar disponibilidad del plato' })
  async toggleAvailability(@Param('id') id: string, @Request() req) {
    return this.dishesService.toggleAvailability(id, req.user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar plato' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.dishesService.remove(id, req.user.tenantId);
    return { success: true };
  }
}
