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
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

@ApiTags('Services (Appointments)')
@ApiBearerAuth()
@Controller('services')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('appointments')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo servicio' })
  @ApiResponse({ status: 201, description: 'Servicio creado exitosamente' })
  create(@Request() req, @Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(req.user.tenantId, createServiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los servicios' })
  @ApiResponse({ status: 200, description: 'Lista de servicios' })
  findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.servicesService.findAll(req.user.tenantId, { status, category });
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener servicios activos' })
  @ApiResponse({ status: 200, description: 'Lista de servicios activos' })
  getActiveServices(@Request() req) {
    return this.servicesService.getActiveServices(req.user.tenantId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Obtener categorías de servicios' })
  @ApiResponse({ status: 200, description: 'Lista de categorías' })
  getCategories(@Request() req) {
    return this.servicesService.getCategories(req.user.tenantId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar servicios' })
  @ApiResponse({ status: 200, description: 'Resultados de búsqueda' })
  search(@Request() req, @Query('q') searchTerm: string) {
    return this.servicesService.search(req.user.tenantId, searchTerm);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un servicio por ID' })
  @ApiResponse({ status: 200, description: 'Servicio encontrado' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.servicesService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un servicio' })
  @ApiResponse({ status: 200, description: 'Servicio actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  update(@Request() req, @Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.servicesService.update(req.user.tenantId, id, updateServiceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un servicio' })
  @ApiResponse({ status: 200, description: 'Servicio eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  remove(@Request() req, @Param('id') id: string) {
    return this.servicesService.remove(req.user.tenantId, id);
  }
}
