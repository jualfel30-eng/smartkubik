import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BeautyServicesService } from '../services/beauty-services.service';

// TODO: Importar decorador @Public() cuando esté disponible
// import { Public } from '../../../decorators/public.decorator';

@ApiTags('Beauty Services (Public)')
// @Public()
@Controller('public/beauty-services')
export class BeautyServicesPublicController {
  constructor(
    private readonly beautyServicesService: BeautyServicesService,
  ) {}

  @Get(':tenantId')
  @ApiOperation({
    summary: 'Obtener servicios activos del tenant (público)',
  })
  async findAll(
    @Param('tenantId') tenantId: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.beautyServicesService.findAll(tenantId, {
      category,
      isActive: true, // Solo activos
      search,
    });
  }

  @Get(':tenantId/categories')
  @ApiOperation({ summary: 'Obtener categorías (público)' })
  async getCategories(@Param('tenantId') tenantId: string) {
    return this.beautyServicesService.getCategories(tenantId);
  }

  @Get(':tenantId/service/:id')
  @ApiOperation({ summary: 'Obtener servicio por ID (público)' })
  async findOne(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.beautyServicesService.findOne(id, tenantId);
  }

  @Get(':tenantId/by-professional/:professionalId')
  @ApiOperation({ summary: 'Servicios de un profesional (público)' })
  async findByProfessional(
    @Param('tenantId') tenantId: string,
    @Param('professionalId') professionalId: string,
  ) {
    return this.beautyServicesService.findByProfessional(
      professionalId,
      tenantId,
    );
  }
}
