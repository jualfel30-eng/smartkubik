import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../guards/module-access.guard';
import { RequireModule } from '../../decorators/require-module.decorator';
import { ResourcesService } from './resources.service';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';

@ApiTags('Resources (Appointments)')
@ApiBearerAuth()
@Controller('resources')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('appointments')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo recurso' })
  @ApiResponse({ status: 201, description: 'Recurso creado exitosamente' })
  create(@Request() req, @Body() createResourceDto: CreateResourceDto) {
    return this.resourcesService.create(req.user.tenantId, createResourceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los recursos' })
  @ApiResponse({ status: 200, description: 'Lista de recursos' })
  findAll(@Request() req, @Query('status') status?: string, @Query('type') type?: string) {
    return this.resourcesService.findAll(req.user.tenantId, { status, type });
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener recursos activos' })
  @ApiResponse({ status: 200, description: 'Lista de recursos activos' })
  getActiveResources(@Request() req) {
    return this.resourcesService.getActiveResources(req.user.tenantId);
  }

  @Get('by-type/:type')
  @ApiOperation({ summary: 'Obtener recursos por tipo' })
  @ApiResponse({ status: 200, description: 'Lista de recursos del tipo especificado' })
  getResourcesByType(@Request() req, @Param('type') type: string) {
    return this.resourcesService.getResourcesByType(req.user.tenantId, type);
  }

  @Get('by-service/:serviceId')
  @ApiOperation({ summary: 'Obtener recursos que pueden realizar un servicio' })
  @ApiResponse({ status: 200, description: 'Lista de recursos compatibles con el servicio' })
  getResourcesByService(@Request() req, @Param('serviceId') serviceId: string) {
    return this.resourcesService.getResourcesByService(req.user.tenantId, serviceId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar recursos' })
  @ApiResponse({ status: 200, description: 'Resultados de búsqueda' })
  search(@Request() req, @Query('q') searchTerm: string) {
    return this.resourcesService.search(req.user.tenantId, searchTerm);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un recurso por ID' })
  @ApiResponse({ status: 200, description: 'Recurso encontrado' })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.resourcesService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un recurso' })
  @ApiResponse({ status: 200, description: 'Recurso actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado' })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateResourceDto: UpdateResourceDto,
  ) {
    return this.resourcesService.update(req.user.tenantId, id, updateResourceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un recurso' })
  @ApiResponse({ status: 200, description: 'Recurso eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado' })
  remove(@Request() req, @Param('id') id: string) {
    return this.resourcesService.remove(req.user.tenantId, id);
  }
}
