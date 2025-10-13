import { Controller, Delete, Param, UseGuards, HttpCode, HttpStatus, Get, Query, Patch, Body, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { SuperAdminService } from './super-admin.service';

@ApiTags('Super Admin')
@ApiBearerAuth()
@Controller('super-admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('tenants')
  @ApiOperation({ summary: '[SUPER ADMIN] Get all tenants with pagination' })
  @ApiResponse({ status: 200, description: 'Lista de tenants obtenida exitosamente.' })
  async getTenants(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
    return this.superAdminService.getTenants(page, limit, search);
  }

  @Get('tenants/:tenantId/configuration')
  @ApiOperation({ summary: '[SUPER ADMIN] Get a specific tenant\'s configuration (modules, roles, permissions)' })
  @ApiResponse({ status: 200, description: 'Configuración del tenant obtenida exitosamente.' })
  async getTenantConfiguration(@Param('tenantId') tenantId: string) {
    return this.superAdminService.getTenantConfiguration(tenantId);
  }

  @Get('settings/:key')
  @ApiOperation({ summary: '[SUPER ADMIN] Get a global setting by key' })
  @ApiResponse({ status: 200, description: 'Setting retrieved successfully.' })
  async getSetting(@Param('key') key: string) {
    return this.superAdminService.getSetting(key);
  }

  @Post('settings')
  @ApiOperation({ summary: '[SUPER ADMIN] Create or update a global setting' })
  @ApiResponse({ status: 200, description: 'Setting updated successfully.' })
  async updateSetting(@Body() body: { key: string; value: string }) {
    return this.superAdminService.updateSetting(body.key, body.value);
  }

  @Patch('tenants/:tenantId/modules')
  @ApiOperation({ summary: '[SUPER ADMIN] Update enabled modules for a tenant' })
  @ApiResponse({ status: 200, description: 'Módulos del tenant actualizados exitosamente.' })
  async updateTenantModules(
    @Param('tenantId') tenantId: string,
    @Body() body: { enabledModules: any },
  ) {
    return this.superAdminService.updateTenantModules(tenantId, body.enabledModules);
  }

  @Patch('roles/:roleId/permissions')
  @ApiOperation({ summary: '[SUPER ADMIN] Update permissions for a role' })
  @ApiResponse({ status: 200, description: 'Permisos del rol actualizados exitosamente.' })
  async updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() body: { permissionIds: string[] },
  ) {
    return this.superAdminService.updateRolePermissions(roleId, body.permissionIds);
  }

  @Get('metrics')
  @ApiOperation({ summary: '[SUPER ADMIN] Get global metrics' })
  @ApiResponse({ status: 200, description: 'Métricas globales obtenidas exitosamente.' })
  async getMetrics() {
    return this.superAdminService.getMetrics();
  }

  @Delete('tenants/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[SUPER ADMIN] Delete a tenant and all associated data' })
  @ApiResponse({ status: 200, description: 'Tenant eliminado exitosamente.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado.' })
  @ApiResponse({ status: 404, description: 'Tenant no encontrado.' })
  async deleteTenant(@Param('id') id: string) {
    return this.superAdminService.deleteTenant(id);
  }
}