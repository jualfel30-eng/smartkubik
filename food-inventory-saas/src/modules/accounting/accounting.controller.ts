import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { AccountingService } from "./accounting.service";
import {
  CreateChartOfAccountDto,
  CreateJournalEntryDto,
} from "../../dto/accounting.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("accounting")
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post("accounts")
  createAccount(@Body() createAccountDto: CreateChartOfAccountDto, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.accountingService.createAccount(createAccountDto, tenantId);
  }

  @Get("accounts")
  async findAllAccounts(@Req() req) {
    const tenantId = req.user.tenantId;
    const accounts = await this.accountingService.findAllAccounts(tenantId);
    return {
      success: true,
      data: accounts,
    };
  }

  @Get("journal-entries")
  findAllJournalEntries(
    @Req() req,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(15), ParseIntPipe) limit: number,
    @Query("isAutomatic") isAutomaticStr?: string,
  ) {
    const tenantId = req.user.tenantId;

    // Convert string to boolean if provided
    let isAutomatic: boolean | undefined = undefined;
    if (isAutomaticStr !== undefined && isAutomaticStr !== "") {
      isAutomatic = isAutomaticStr === "true";
    }

    return this.accountingService.findAllJournalEntries(tenantId, page, limit, isAutomatic);
  }

  @Post("journal-entries")
  createJournalEntry(
    @Body() createJournalEntryDto: CreateJournalEntryDto,
    @Req() req,
  ) {
    const tenantId = req.user.tenantId;
    return this.accountingService.createJournalEntry(
      createJournalEntryDto,
      tenantId,
    );
  }

  @Get("reports/profit-and-loss")
  getProfitAndLossReport(
    @Req() req,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    const tenantId = req.user.tenantId;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setUTCHours(23, 59, 59, 999); // Set to the end of the day UTC
    return this.accountingService.getProfitAndLoss(tenantId, fromDate, toDate);
  }

  @Get("reports/balance-sheet")
  getBalanceSheetReport(@Req() req, @Query("asOfDate") asOfDateString: string) {
    const tenantId = req.user.tenantId;
    // If no date is provided, default to the current date
    const asOfDate = asOfDateString ? new Date(asOfDateString) : new Date();
    return this.accountingService.getBalanceSheet(tenantId, asOfDate);
  }

  @Get("reports/accounts-receivable")
  getAccountsReceivableReport(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.accountingService.getAccountsReceivable(tenantId);
  }

  @Get("reports/accounts-payable")
  getAccountsPayableReport(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.accountingService.getAccountsPayable(tenantId);
  }

  @Get("reports/cash-flow-statement")
  getCashFlowStatement(
    @Req() req,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    const tenantId = req.user.tenantId;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setUTCHours(23, 59, 59, 999); // Set to the end of the day UTC
    return this.accountingService.getCashFlowStatement(
      tenantId,
      fromDate,
      toDate,
    );
  }

  // ==================== PHASE 2: Advanced Accounting Reports ====================

  @Get("reports/trial-balance")
  getTrialBalance(
    @Req() req,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("accountType") accountType?: string,
    @Query("includeZeroBalances") includeZeroBalances?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.accountingService.getTrialBalance(
      tenantId,
      startDate,
      endDate,
      accountType,
      includeZeroBalances === 'true',
    );
  }

  @Get("reports/general-ledger")
  getGeneralLedger(
    @Req() req,
    @Query("accountCode") accountCode: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.accountingService.getGeneralLedger(
      tenantId,
      accountCode,
      startDate,
      endDate,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 100,
    );
  }
}
