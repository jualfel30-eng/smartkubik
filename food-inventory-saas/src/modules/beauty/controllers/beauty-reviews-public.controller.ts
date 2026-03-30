import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BeautyReviewsService } from '../services/beauty-reviews.service';
import { CreateReviewDto } from '../../../dto/beauty';

@ApiTags('Beauty Reviews (Public)')
// @Public()
@Controller('public/beauty-reviews')
export class BeautyReviewsPublicController {
  constructor(private readonly beautyReviewsService: BeautyReviewsService) {}

  @Get(':tenantId')
  @ApiOperation({ summary: 'Obtener reseñas aprobadas (público)' })
  async findAll(
    @Param('tenantId') tenantId: string,
    @Query('professionalId') professionalId?: string,
    @Query('minRating') minRating?: number,
  ) {
    return this.beautyReviewsService.findAll(tenantId, {
      isApproved: true, // Solo aprobadas
      professionalId,
      minRating: minRating ? Number(minRating) : undefined,
    });
  }

  @Get(':tenantId/average-rating')
  @ApiOperation({ summary: 'Obtener rating promedio (público)' })
  async getAverageRating(
    @Param('tenantId') tenantId: string,
    @Query('professionalId') professionalId?: string,
  ) {
    return this.beautyReviewsService.getAverageRating(
      tenantId,
      professionalId,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Crear reseña (público - post-booking)' })
  async create(@Body() dto: CreateReviewDto) {
    return this.beautyReviewsService.create(dto);
  }
}
