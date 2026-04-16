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
import { BeautyPackagesService } from '../services/service-packages.service';
import { CreateServicePackageDto } from '../../../dto/beauty/create-service-package.dto';
import { UpdateServicePackageDto } from '../../../dto/beauty/update-service-package.dto';

@ApiTags('Beauty Packages (Private)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('beauty-packages')
export class BeautyPackagesController {
  constructor(private readonly packagesService: BeautyPackagesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear paquete de servicios beauty' })
  async create(@Body() dto: CreateServicePackageDto, @Request() req) {
    return this.packagesService.create(dto, req.user.tenantId, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar paquetes del tenant' })
  async findAll(@Request() req, @Query('isActive') isActive?: string) {
    const filters: any = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    return this.packagesService.findAll(req.user.tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener paquete por ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.packagesService.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar paquete' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateServicePackageDto,
    @Request() req,
  ) {
    return this.packagesService.update(id, dto, req.user.tenantId, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar paquete beauty (soft delete)' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.packagesService.remove(id, req.user.tenantId);
  }
}
