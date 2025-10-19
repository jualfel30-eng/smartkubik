import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { ModuleAccessGuard } from "../../guards/module-access.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { RequireModule } from "../../decorators/require-module.decorator";
import {
  CreateBankTransactionDto,
  BankTransactionQueryDto,
} from "../../dto/bank-transaction.dto";
import { BankTransactionsService } from "./bank-transactions.service";
import { BankAccountsService } from "./bank-accounts.service";

@Controller("bank-accounts/:accountId/movements")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, ModuleAccessGuard)
@RequireModule("bankAccounts")
export class BankTransactionsController {
  constructor(
    private readonly bankTransactionsService: BankTransactionsService,
    private readonly bankAccountsService: BankAccountsService,
  ) {}

  @Get()
  @Permissions("accounting_read")
  async findAll(
    @Param("accountId") accountId: string,
    @Query() query: BankTransactionQueryDto,
    @Request() req,
  ) {
    const result = await this.bankTransactionsService.listTransactions(
      req.user.tenantId,
      accountId,
      query,
    );
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Post()
  @Permissions("accounting_write")
  async createManual(
    @Param("accountId") accountId: string,
    @Body() dto: CreateBankTransactionDto,
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const adjustment = dto.type === "credit" ? dto.amount : -1 * dto.amount;

    if (!Number.isFinite(adjustment)) {
      throw new BadRequestException("Monto inválido para el movimiento");
    }

    const updatedAccount = await this.bankAccountsService.updateBalance(
      accountId,
      adjustment,
      tenantId,
      undefined,
      { userId },
    );

    const transaction = await this.bankTransactionsService.createTransaction(
      tenantId,
      accountId,
      dto,
      userId,
      updatedAccount.currentBalance,
      {
        metadata: {
          ...(dto.metadata ?? {}),
          createdFrom: "manual_adjustment",
        },
      },
    );

    return {
      success: true,
      data: transaction,
    };
  }
}
