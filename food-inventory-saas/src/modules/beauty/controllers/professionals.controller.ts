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
import { ProfessionalsService } from '../services/professionals.service';
import {
  CreateProfessionalDto,
  UpdateProfessionalDto,
} from '../../../dto/beauty';

@ApiTags('Professionals (Private)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  // @Permissions('professionals_create')
  @ApiOperation({ summary: 'Crear nuevo profesional' })
  async create(@Body() dto: CreateProfessionalDto, @Request() req) {
    return this.professionalsService.create(
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Get()
  // @Permissions('professionals_read')
  @ApiOperation({ summary: 'Obtener todos los profesionales' })
  async findAll(
    @Request() req,
    @Query('locationId') locationId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.professionalsService.findAll(req.user.tenantId, {
      locationId,
      isActive,
    });
  }

  @Get(':id')
  // @Permissions('professionals_read')
  @ApiOperation({ summary: 'Obtener profesional por ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.professionalsService.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  // @Permissions('professionals_update')
  @ApiOperation({ summary: 'Actualizar profesional' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalDto,
    @Request() req,
  ) {
    return this.professionalsService.update(
      id,
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Delete(':id')
  // @Permissions('professionals_delete')
  @ApiOperation({ summary: 'Eliminar profesional (soft delete)' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.professionalsService.remove(id, req.user.tenantId);
  }
}
