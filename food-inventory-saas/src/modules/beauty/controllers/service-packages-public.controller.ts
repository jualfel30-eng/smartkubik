import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BeautyPackagesService } from '../services/service-packages.service';

@ApiTags('Beauty Packages (Public)')
@Controller('public/beauty-packages')
export class BeautyPackagesPublicController {
  constructor(private readonly packagesService: BeautyPackagesService) {}

  @Get(':tenantId')
  @ApiOperation({ summary: 'Listar paquetes beauty activos del tenant (público)' })
  async findAll(@Param('tenantId') tenantId: string) {
    return this.packagesService.findAll(tenantId, { isActive: true });
  }

  @Get(':tenantId/:id')
  @ApiOperation({ summary: 'Obtener paquete beauty por ID (público)' })
  async findOne(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.packagesService.findOne(id, tenantId);
  }
}
