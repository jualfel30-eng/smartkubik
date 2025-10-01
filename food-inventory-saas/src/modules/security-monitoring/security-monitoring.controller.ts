import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityMonitoringService } from './security-monitoring.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { Permissions } from '../../decorators/permissions.decorator';
import { Public } from '../../decorators/public.decorator';

@ApiTags('Security Monitoring')
@Controller('security-monitoring')
export class SecurityMonitoringController {
  constructor(
    private readonly securityMonitoringService: SecurityMonitoringService,
  ) {}

  @Post('csp-report')
  @Public()
  @ApiOperation({ summary: 'CSP violation report endpoint' })
  async reportCSPViolation(@Body() report: any, @Request() req): Promise<void> {
    const ipAddress = req.ip || req.connection.remoteAddress;
    await this.securityMonitoringService.logCSPViolation(report, ipAddress);
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('view_security_metrics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get security metrics for last 24 hours' })
  async getSecurityMetrics(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.securityMonitoringService.getSecurityMetrics(tenantId);
  }

  @Get('alerts')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('view_security_alerts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent security alerts' })
  async getRecentAlerts(
    @Request() req,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user.tenantId;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.securityMonitoringService.getRecentAlerts(limitNum, tenantId);
  }
}
