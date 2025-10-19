import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { FEATURES } from "../../config/features.config";
import { BankAccountsService } from "./bank-accounts.service";
import { BankTransactionsService } from "./bank-transactions.service";
import { CreateBankTransferDto } from "../../dto/bank-transaction.dto";

@Injectable()
export class BankTransfersService {
  constructor(
    private readonly bankAccountsService: BankAccountsService,
    private readonly bankTransactionsService: BankTransactionsService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async createTransfer(
    tenantId: string,
    userId: string,
    sourceAccountId: string,
    dto: CreateBankTransferDto,
  ) {
    if (!FEATURES.BANK_ACCOUNTS_TRANSFERS) {
      throw new BadRequestException(
        "La funcionalidad de transferencias está desactivada.",
      );
    }

    if (sourceAccountId === dto.destinationAccountId) {
      throw new BadRequestException(
        "La cuenta origen y destino no pueden ser iguales.",
      );
    }

    if (dto.amount <= 0) {
      throw new BadRequestException("El monto debe ser mayor a cero.");
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const sourceAccount = await this.bankAccountsService.findOne(
        sourceAccountId,
        tenantId,
        session,
      );

      const destinationAccount = await this.bankAccountsService.findOne(
        dto.destinationAccountId,
        tenantId,
        session,
      );

      if (sourceAccount.currentBalance < dto.amount) {
        throw new BadRequestException(
          "Fondos insuficientes en la cuenta origen.",
        );
      }

      const updatedSource = await this.bankAccountsService.updateBalance(
        sourceAccountId,
        -dto.amount,
        tenantId,
        session,
        { userId },
      );

      const updatedDestination = await this.bankAccountsService.updateBalance(
        dto.destinationAccountId,
        dto.amount,
        tenantId,
        session,
        { userId },
      );

      const transfer = await this.bankTransactionsService.createTransfer(
        tenantId,
        sourceAccountId,
        dto.destinationAccountId,
        dto,
        userId,
        updatedSource.currentBalance,
        updatedDestination.currentBalance,
        session,
      );

      await session.commitTransaction();

      return {
        transferGroupId: transfer.transferGroupId,
        debitTransaction: transfer.debit,
        creditTransaction: transfer.credit,
        sourceAccountBalance: updatedSource.currentBalance,
        destinationAccountBalance: updatedDestination.currentBalance,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
