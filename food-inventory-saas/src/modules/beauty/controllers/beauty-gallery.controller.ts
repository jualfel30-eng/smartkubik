import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TenantGuard } from '../../../guards/tenant.guard';
import { BeautyGalleryService } from '../services/beauty-gallery.service';
import {
  CreateGalleryItemDto,
  UpdateGalleryItemDto,
} from '../../../dto/beauty';

@ApiTags('Beauty Gallery (Private)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('beauty-gallery')
export class BeautyGalleryController {
  constructor(private readonly beautyGalleryService: BeautyGalleryService) {}

  @Post()
  // @Permissions('beauty_gallery_create')
  @ApiOperation({ summary: 'Agregar item a galería' })
  async create(@Body() dto: CreateGalleryItemDto, @Request() req) {
    return this.beautyGalleryService.create(
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Get()
  // @Permissions('beauty_gallery_read')
  @ApiOperation({ summary: 'Obtener items de galería' })
  async findAll(
    @Request() req,
    @Query('category') category?: string,
    @Query('professionalId') professionalId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.beautyGalleryService.findAll(req.user.tenantId, {
      category,
      professionalId,
      isActive,
    });
  }

  @Get('categories')
  // @Permissions('beauty_gallery_read')
  @ApiOperation({ summary: 'Obtener categorías de galería' })
  async getCategories(@Request() req) {
    return this.beautyGalleryService.getCategories(req.user.tenantId);
  }

  @Get(':id')
  // @Permissions('beauty_gallery_read')
  @ApiOperation({ summary: 'Obtener item por ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.beautyGalleryService.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  // @Permissions('beauty_gallery_update')
  @ApiOperation({ summary: 'Actualizar item' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGalleryItemDto,
    @Request() req,
  ) {
    return this.beautyGalleryService.update(
      id,
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Delete(':id')
  // @Permissions('beauty_gallery_delete')
  @ApiOperation({ summary: 'Eliminar item' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.beautyGalleryService.remove(id, req.user.tenantId);
  }
}
