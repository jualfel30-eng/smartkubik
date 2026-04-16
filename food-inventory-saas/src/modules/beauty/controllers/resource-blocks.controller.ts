import {
  Controller,
  Post,
  Get,
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
import { ResourceBlocksService } from '../services/resource-blocks.service';
import { CreateResourceBlockDto } from '../../../dto/beauty/create-resource-block.dto';

@ApiTags('Resource Blocks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('resource-blocks')
export class ResourceBlocksController {
  constructor(private readonly resourceBlocksService: ResourceBlocksService) {}

  @Post()
  @ApiOperation({ summary: 'Crear bloqueo de recurso/profesional' })
  async create(@Body() dto: CreateResourceBlockDto, @Request() req) {
    return this.resourceBlocksService.create(
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar bloqueos de recursos' })
  async findAll(
    @Request() req,
    @Query('professionalId') professionalId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.resourceBlocksService.findAll(req.user.tenantId, {
      professionalId,
      startDate,
      endDate,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar bloqueo (soft delete)' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.resourceBlocksService.softDelete(id, req.user.tenantId);
    return { success: true, message: 'Bloqueo eliminado' };
  }
}
