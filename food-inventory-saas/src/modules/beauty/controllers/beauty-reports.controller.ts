import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TenantGuard } from '../../../guards/tenant.guard';
import { BeautyReportsService } from '../services/beauty-reports.service';

@ApiTags('Beauty Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('beauty-reports')
export class BeautyReportsController {
  constructor(private readonly reportsService: BeautyReportsService) {}

  // 6.1 Revenue by professional
  @Get('revenue-by-professional')
  @ApiOperation({ summary: 'Ingresos por profesional' })
  async revenueByProfessional(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getRevenueByProfessional(
      req.user.tenantId,
      startDate,
      endDate,
    );
  }

  // 6.2 Popular services
  @Get('popular-services')
  @ApiOperation({ summary: 'Servicios más populares' })
  async popularServices(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getPopularServices(
      req.user.tenantId,
      startDate,
      endDate,
    );
  }

  // 6.3 No-show rate
  @Get('no-show-rate')
  @ApiOperation({ summary: 'Tasa de no-show y cancelaciones' })
  async noShowRate(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getNoShowRate(
      req.user.tenantId,
      startDate,
      endDate,
      groupBy,
    );
  }

  // 6.4 Client retention
  @Get('client-retention')
  @ApiOperation({ summary: 'Retención de clientes' })
  async clientRetention(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getClientRetention(
      req.user.tenantId,
      startDate,
      endDate,
    );
  }

  // 6.5 Peak hours
  @Get('peak-hours')
  @ApiOperation({ summary: 'Horas pico' })
  async peakHours(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getPeakHours(
      req.user.tenantId,
      startDate,
      endDate,
    );
  }

  // 6.6 Utilization
  @Get('utilization')
  @ApiOperation({ summary: 'Utilización de profesionales' })
  async utilization(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getUtilization(
      req.user.tenantId,
      startDate,
      endDate,
    );
  }
}
