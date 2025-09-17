import { Controller, Post, Body, UseGuards, Req, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CreateChartOfAccountDto, CreateJournalEntryDto } from '../../dto/accounting.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { Public } from '../../decorators/public.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('accounts')
  createAccount(@Body() createAccountDto: CreateChartOfAccountDto, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.accountingService.createAccount(createAccountDto, tenantId);
  }

  @Get('accounts')
  findAllAccounts(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.accountingService.findAllAccounts(tenantId);
  }

  @Get('journal-entries')
  findAllJournalEntries(
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(15), ParseIntPipe) limit: number,
  ) {
    const tenantId = req.user.tenantId;
    return this.accountingService.findAllJournalEntries(tenantId, page, limit);
  }

  @Post('journal-entries')
  createJournalEntry(@Body() createJournalEntryDto: CreateJournalEntryDto, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.accountingService.createJournalEntry(createJournalEntryDto, tenantId);
  }

  @Get('reports/profit-and-loss')
  getProfitAndLossReport(
    @Req() req,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const tenantId = req.user.tenantId;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.accountingService.getProfitAndLoss(tenantId, fromDate, toDate);
  }

  @Get('reports/balance-sheet')
  getBalanceSheetReport(
    @Req() req,
    @Query('asOfDate') asOfDateString: string,
  ) {
    const tenantId = req.user.tenantId;
    // If no date is provided, default to the current date
    const asOfDate = asOfDateString ? new Date(asOfDateString) : new Date();
    return this.accountingService.getBalanceSheet(tenantId, asOfDate);
  }

  
}
