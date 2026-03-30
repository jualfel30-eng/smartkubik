import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BeautyGalleryService } from '../services/beauty-gallery.service';

@ApiTags('Beauty Gallery (Public)')
// @Public()
@Controller('public/beauty-gallery')
export class BeautyGalleryPublicController {
  constructor(private readonly beautyGalleryService: BeautyGalleryService) {}

  @Get(':tenantId')
  @ApiOperation({ summary: 'Obtener galería pública del salón' })
  async findAll(
    @Param('tenantId') tenantId: string,
    @Query('category') category?: string,
    @Query('professionalId') professionalId?: string,
  ) {
    return this.beautyGalleryService.findAll(tenantId, {
      category,
      professionalId,
      isActive: true, // Solo items activos
    });
  }

  @Get(':tenantId/categories')
  @ApiOperation({ summary: 'Obtener categorías de galería (público)' })
  async getCategories(@Param('tenantId') tenantId: string) {
    return this.beautyGalleryService.getCategories(tenantId);
  }
}
