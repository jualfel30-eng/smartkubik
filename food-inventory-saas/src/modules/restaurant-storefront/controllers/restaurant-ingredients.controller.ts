import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { RestaurantIngredientsService } from '../services/restaurant-ingredients.service';
import {
  CreateRestaurantIngredientDto,
  UpdateRestaurantIngredientDto,
} from '../dto/restaurant-ingredient.dto';

@ApiTags('Restaurant - Ingredients (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant-ingredients')
export class RestaurantIngredientsController {
  constructor(private readonly ingredientsService: RestaurantIngredientsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar ingredientes del tenant (admin)' })
  async findAll(@Request() req) {
    return this.ingredientsService.findAll(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear ingrediente' })
  async create(@Body() dto: CreateRestaurantIngredientDto, @Request() req) {
    return this.ingredientsService.create(dto, req.user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar ingrediente' })
  async update(@Param('id') id: string, @Body() dto: UpdateRestaurantIngredientDto, @Request() req) {
    return this.ingredientsService.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar ingrediente' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.ingredientsService.remove(id, req.user.tenantId);
    return { success: true };
  }
}
