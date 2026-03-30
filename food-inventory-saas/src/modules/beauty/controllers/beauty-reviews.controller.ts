import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BeautyReviewsService } from '../services/beauty-reviews.service';
import { ApproveReviewDto } from '../../../dto/beauty';

@ApiTags('Beauty Reviews (Private)')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('beauty-reviews')
export class BeautyReviewsController {
  constructor(private readonly beautyReviewsService: BeautyReviewsService) {}

  @Get()
  // @Permissions('beauty_reviews_read')
  @ApiOperation({ summary: 'Obtener todas las reseñas' })
  async findAll(
    @Request() req,
    @Query('isApproved') isApproved?: boolean,
    @Query('professionalId') professionalId?: string,
    @Query('minRating') minRating?: number,
  ) {
    return this.beautyReviewsService.findAll(req.user.tenantId, {
      isApproved: isApproved !== undefined ? isApproved === true : undefined,
      professionalId,
      minRating: minRating ? Number(minRating) : undefined,
    });
  }

  @Get('stats/average-rating')
  // @Permissions('beauty_reviews_read')
  @ApiOperation({ summary: 'Obtener rating promedio' })
  async getAverageRating(
    @Request() req,
    @Query('professionalId') professionalId?: string,
  ) {
    return this.beautyReviewsService.getAverageRating(
      req.user.tenantId,
      professionalId,
    );
  }

  @Get(':id')
  // @Permissions('beauty_reviews_read')
  @ApiOperation({ summary: 'Obtener reseña por ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.beautyReviewsService.findOne(id, req.user.tenantId);
  }

  @Patch(':id/approve')
  // @Permissions('beauty_reviews_moderate')
  @ApiOperation({ summary: 'Aprobar/rechazar reseña' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveReviewDto,
    @Request() req,
  ) {
    return this.beautyReviewsService.approve(
      id,
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }
}
