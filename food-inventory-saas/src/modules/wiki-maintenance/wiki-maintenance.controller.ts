import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { SuperAdminGuard } from '../super-admin/guards/super-admin.guard';
import { WikiMaintenanceService } from './wiki-maintenance.service';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

class UpdateConfigDto {
  @IsInt()
  @Min(1)
  @Max(30)
  intervalDays: number;
}

class MarkSyncedDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('Wiki Maintenance')
@ApiBearerAuth()
@Controller('admin/wiki')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class WikiMaintenanceController {
  constructor(private readonly service: WikiMaintenanceService) {}

  @Get('status')
  @ApiOperation({ summary: '[SUPER ADMIN] Get wiki sync status' })
  async getStatus() {
    const data = await this.service.getStatus();
    return { success: true, data };
  }

  @Get('pending-reviews')
  @ApiOperation({ summary: '[SUPER ADMIN] List pending review entries' })
  async getPendingReviews() {
    const data = await this.service.getPendingReviews();
    return { success: true, data };
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[SUPER ADMIN] Mark current pending reviews as synced' })
  async markAsSynced(@Body() dto: MarkSyncedDto, @Request() req: any) {
    const userId = req.user?.id || req.user?._id?.toString();
    const userName =
      req.user?.firstName || req.user?.email || 'super-admin';
    const result = await this.service.markAsSynced(userId, userName, dto?.notes);
    return { success: true, data: result };
  }

  @Get('history')
  @ApiOperation({ summary: '[SUPER ADMIN] List past sync events' })
  async getHistory(@Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 20;
    const data = await this.service.getHistory(isNaN(parsed) ? 20 : parsed);
    return { success: true, data };
  }

  @Get('history/:id')
  @ApiOperation({ summary: '[SUPER ADMIN] Get a specific sync event with snapshot' })
  async getHistoryEntry(@Param('id') id: string) {
    const data = await this.service.getHistoryEntry(id);
    return { success: true, data };
  }

  @Get('config')
  @ApiOperation({ summary: '[SUPER ADMIN] Get wiki maintenance config' })
  async getConfig() {
    const data = await this.service.getConfig();
    return { success: true, data };
  }

  @Put('config')
  @ApiOperation({ summary: '[SUPER ADMIN] Update wiki maintenance config' })
  async updateConfig(@Body() dto: UpdateConfigDto, @Request() req: any) {
    const userId = req.user?.id || req.user?._id?.toString();
    const data = await this.service.updateConfig(dto.intervalDays, userId);
    return { success: true, data };
  }

  @Get('tree')
  @ApiOperation({ summary: '[SUPER ADMIN] Get wiki file tree (folders + .md files)' })
  async getTree() {
    const data = await this.service.getTree();
    return { success: true, data };
  }

  @Get('page')
  @ApiOperation({ summary: '[SUPER ADMIN] Get markdown content of a wiki page' })
  async getPage(@Query('path') path: string) {
    const data = await this.service.getPage(path);
    return { success: true, data };
  }
}
