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
import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountDto, UpdateBankAccountDto, AdjustBalanceDto } from '../../dto/bank-account.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { ModuleAccessGuard } from '../../guards/module-access.guard';
import { Permissions } from '../../decorators/permissions.decorator';
import { RequireModule } from '../../decorators/require-module.decorator';
import { BankTransactionsService } from './bank-transactions.service';
import { CreateBankTransactionDto } from '../../dto/bank-transaction.dto';

@Controller('bank-accounts')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, ModuleAccessGuard)
@RequireModule('bankAccounts')
export class BankAccountsController {
  constructor(
    private readonly bankAccountsService: BankAccountsService,
    private readonly bankTransactionsService: BankTransactionsService,
  ) {}

  @Post()
  @Permissions('accounting_write')
  async create(@Body() createBankAccountDto: CreateBankAccountDto, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.bankAccountsService.create(createBankAccountDto, tenantId);
  }

  @Get()
  @Permissions('accounting_read')
  async findAll(@Request() req, @Query('includeInactive') includeInactive?: string) {
    const tenantId = req.user.tenantId;
    const includeInactiveBool = includeInactive === 'true';
    return this.bankAccountsService.findAll(tenantId, includeInactiveBool);
  }

  @Get('balance/total')
  @Permissions('accounting_read')
  async getTotalBalance(@Request() req, @Query('currency') currency?: string) {
    const tenantId = req.user.tenantId;
    const total = await this.bankAccountsService.getTotalBalance(tenantId, currency);
    return { total, currency: currency || 'all' };
  }

  @Get('balance/by-currency')
  @Permissions('accounting_read')
  async getBalancesByCurrency(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.bankAccountsService.getBalancesByCurrency(tenantId);
  }

  @Get(':id')
  @Permissions('accounting_read')
  async findOne(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.bankAccountsService.findOne(id, tenantId);
  }

  @Put(':id')
  @Permissions('accounting_write')
  async update(
    @Param('id') id: string,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    return this.bankAccountsService.update(id, updateBankAccountDto, tenantId);
  }

  @Delete(':id')
  @Permissions('accounting_write')
  async delete(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    await this.bankAccountsService.delete(id, tenantId);
    return { message: 'Bank account deleted successfully' };
  }

  @Post(':id/adjust-balance')
  @Permissions('accounting_write')
  async adjustBalance(
    @Param('id') id: string,
    @Body() adjustBalanceDto: AdjustBalanceDto,
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    const updatedAccount = await this.bankAccountsService.adjustBalance(
      id,
      adjustBalanceDto,
      tenantId,
    );

    const transactionDto: CreateBankTransactionDto = {
      type: adjustBalanceDto.type === 'increase' ? 'credit' : 'debit',
      channel: 'ajuste_manual',
      amount: adjustBalanceDto.amount,
      description: `Ajuste manual: ${adjustBalanceDto.reason}`,
      reference: adjustBalanceDto.reference,
      metadata: { reason: adjustBalanceDto.reason },
    };

    await this.bankTransactionsService.createTransaction(
      tenantId,
      id,
      transactionDto,
      req.user.id,
      updatedAccount.currentBalance,
      {
        metadata: {
          ...(transactionDto.metadata ?? {}),
          createdFrom: 'adjust_balance_endpoint',
        },
      },
    );

    return updatedAccount;
  }
}
