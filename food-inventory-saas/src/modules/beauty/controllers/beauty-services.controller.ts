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
import { BeautyServicesService } from '../services/beauty-services.service';
import {
  CreateBeautyServiceDto,
  UpdateBeautyServiceDto,
} from '../../../dto/beauty';

// TODO: Importar guards cuando estén disponibles
// import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
// import { TenantGuard } from '../../../guards/tenant.guard';
// import { PermissionsGuard } from '../../../guards/permissions.guard';
// import { Permissions } from '../../../decorators/permissions.decorator';

@ApiTags('Beauty Services (Private)')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('beauty-services')
export class BeautyServicesController {
  constructor(
    private readonly beautyServicesService: BeautyServicesService,
  ) {}

  @Post()
  // @Permissions('beauty_services_create')
  @ApiOperation({ summary: 'Crear nuevo servicio de belleza' })
  async create(@Body() dto: CreateBeautyServiceDto, @Request() req) {
    return this.beautyServicesService.create(
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Get()
  // @Permissions('beauty_services_read')
  @ApiOperation({ summary: 'Obtener todos los servicios' })
  async findAll(
    @Request() req,
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ) {
    return this.beautyServicesService.findAll(req.user.tenantId, {
      category,
      isActive,
      search,
    });
  }

  @Get('categories')
  // @Permissions('beauty_services_read')
  @ApiOperation({ summary: 'Obtener categorías' })
  async getCategories(@Request() req) {
    return this.beautyServicesService.getCategories(req.user.tenantId);
  }

  @Get(':id')
  // @Permissions('beauty_services_read')
  @ApiOperation({ summary: 'Obtener servicio por ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.beautyServicesService.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  // @Permissions('beauty_services_update')
  @ApiOperation({ summary: 'Actualizar servicio' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBeautyServiceDto,
    @Request() req,
  ) {
    return this.beautyServicesService.update(
      id,
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Delete(':id')
  // @Permissions('beauty_services_delete')
  @ApiOperation({ summary: 'Eliminar servicio (soft delete)' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.beautyServicesService.remove(id, req.user.tenantId);
  }

  @Get('by-professional/:professionalId')
  // @Permissions('beauty_services_read')
  @ApiOperation({ summary: 'Obtener servicios de un profesional' })
  async findByProfessional(
    @Param('professionalId') professionalId: string,
    @Request() req,
  ) {
    return this.beautyServicesService.findByProfessional(
      professionalId,
      req.user.tenantId,
    );
  }
}
