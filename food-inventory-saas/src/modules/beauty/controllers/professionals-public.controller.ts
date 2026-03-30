import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProfessionalsService } from '../services/professionals.service';

@ApiTags('Professionals (Public)')
// @Public()
@Controller('public/professionals')
export class ProfessionalsPublicController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get(':tenantId')
  @ApiOperation({ summary: 'Obtener profesionales activos (público)' })
  async findAll(
    @Param('tenantId') tenantId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.professionalsService.findAll(tenantId, {
      locationId,
      isActive: true, // Solo activos
    });
  }

  @Get(':tenantId/professional/:id')
  @ApiOperation({ summary: 'Obtener profesional por ID (público)' })
  async findOne(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.professionalsService.findOne(id, tenantId);
  }

  @Get(':tenantId/by-services')
  @ApiOperation({
    summary: 'Profesionales que ofrecen servicios específicos (público)',
  })
  async findByServices(
    @Param('tenantId') tenantId: string,
    @Query('serviceIds') serviceIds: string,
  ) {
    const serviceIdArray = serviceIds.split(',');
    return this.professionalsService.findByServices(serviceIdArray, tenantId);
  }
}
