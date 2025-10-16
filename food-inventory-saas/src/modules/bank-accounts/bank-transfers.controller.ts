import {
  Body,
  Controller,
  Param,
  Post,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { ModuleAccessGuard } from '../../guards/module-access.guard';
import { Permissions } from '../../decorators/permissions.decorator';
import { RequireModule } from '../../decorators/require-module.decorator';
import { CreateBankTransferDto } from '../../dto/bank-transaction.dto';
import { BankAccountsService } from './bank-accounts.service';
import { BankTransactionsService } from './bank-transactions.service';

@Controller('bank-accounts/:accountId/transfers')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, ModuleAccessGuard)
@RequireModule('bankAccounts')
export class BankTransfersController {
  constructor(
    private readonly bankAccountsService: BankAccountsService,
    private readonly bankTransactionsService: BankTransactionsService,
  ) {}

  @Post()
  @Permissions('accounting_write')
  async createTransfer(
    @Param('accountId') accountId: string,
    @Body() dto: CreateBankTransferDto,
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    if (accountId === dto.destinationAccountId) {
      throw new BadRequestException(
        'La cuenta origen y destino no pueden ser iguales.',
      );
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero.');
    }

    const sourceAccount = await this.bankAccountsService.findOne(
      accountId,
      tenantId,
    );
    await this.bankAccountsService.findOne(
      dto.destinationAccountId,
      tenantId,
    );

    if (sourceAccount.currentBalance < dto.amount) {
      throw new BadRequestException('Fondos insuficientes en la cuenta origen.');
    }

    const updatedSource = await this.bankAccountsService.updateBalance(
      accountId,
      -dto.amount,
      tenantId,
    );

    const updatedDestination = await this.bankAccountsService.updateBalance(
      dto.destinationAccountId,
      dto.amount,
      tenantId,
    );

    const transfer = await this.bankTransactionsService.createTransfer(
      tenantId,
      accountId,
      dto.destinationAccountId,
      dto,
      userId,
      updatedSource.currentBalance,
      updatedDestination.currentBalance,
    );

    return {
      success: true,
      data: transfer,
    };
  }
}
