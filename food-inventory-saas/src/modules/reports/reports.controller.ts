
import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { AccountsReceivableReportQueryDto } from './dto/reports.dto';
import { TenantGuard } from 'src/guards/tenant.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('accounts-receivable')
  getAccountsReceivableReport(
    @Req() req,
    @Query() query: AccountsReceivableReportQueryDto,
  ) {
    return this.reportsService.generateAccountsReceivableAging(
      req.tenantId,
      query.asOfDate,
    );
  }
}
