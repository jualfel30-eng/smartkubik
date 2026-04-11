import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { RestaurantCategoriesService } from '../services/restaurant-categories.service';
import {
  CreateRestaurantCategoryDto,
  UpdateRestaurantCategoryDto,
} from '../dto/restaurant-category.dto';

@ApiTags('Restaurant - Categories (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant-categories')
export class RestaurantCategoriesController {
  constructor(private readonly categoriesService: RestaurantCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorías del tenant (admin)' })
  async findAll(@Request() req) {
    return this.categoriesService.findAll(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear categoría' })
  async create(@Body() dto: CreateRestaurantCategoryDto, @Request() req) {
    return this.categoriesService.create(dto, req.user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar categoría' })
  async update(@Param('id') id: string, @Body() dto: UpdateRestaurantCategoryDto, @Request() req) {
    return this.categoriesService.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar categoría' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.categoriesService.remove(id, req.user.tenantId);
    return { success: true };
  }
}
