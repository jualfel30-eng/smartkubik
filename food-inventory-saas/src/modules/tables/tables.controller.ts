import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { Permissions } from '../../decorators/permissions.decorator';

@Controller('tables')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @Permissions('restaurant_write')
  async create(@Body() dto: any, @Request() req) {
    return this.tablesService.create(dto, req.user.tenantId);
  }

  @Get()
  @Permissions('restaurant_read')
  async findAll(@Request() req) {
    return this.tablesService.findAll(req.user.tenantId);
  }

  @Get('floor-plan')
  @Permissions('restaurant_read')
  async getFloorPlan(@Request() req) {
    return this.tablesService.getFloorPlan(req.user.tenantId);
  }

  @Get('section/:section')
  @Permissions('restaurant_read')
  async findBySection(@Param('section') section: string, @Request() req) {
    return this.tablesService.findBySection(section, req.user.tenantId);
  }

  @Get('available')
  @Permissions('restaurant_read')
  async findAvailable(@Request() req) {
    return this.tablesService.findAvailable(req.user.tenantId);
  }

  @Post('seat-guests')
  @Permissions('restaurant_write')
  async seatGuests(@Body() dto: any, @Request() req) {
    return this.tablesService.seatGuests(dto, req.user.tenantId);
  }

  @Post(':id/clear')
  @Permissions('restaurant_write')
  async clearTable(@Param('id') id: string, @Request() req) {
    return this.tablesService.clearTable(id, req.user.tenantId);
  }

  @Post('transfer')
  @Permissions('restaurant_write')
  async transferTable(@Body() dto: any, @Request() req) {
    return this.tablesService.transferTable(dto, req.user.tenantId);
  }

  @Post('combine')
  @Permissions('restaurant_write')
  async combineTables(@Body() dto: any, @Request() req) {
    return this.tablesService.combineTables(dto, req.user.tenantId);
  }

  @Patch(':id')
  @Permissions('restaurant_write')
  async update(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.tablesService.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @Permissions('restaurant_write')
  async delete(@Param('id') id: string, @Request() req) {
    await this.tablesService.delete(id, req.user.tenantId);
    return { message: 'Table deleted successfully' };
  }
}
