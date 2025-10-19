import {
  Body,
  Controller,
  Param,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { ModuleAccessGuard } from "../../guards/module-access.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { RequireModule } from "../../decorators/require-module.decorator";
import { CreateBankTransferDto } from "../../dto/bank-transaction.dto";
import { BankTransfersService } from "./bank-transfers.service";

@Controller("bank-accounts/:accountId/transfers")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, ModuleAccessGuard)
@RequireModule("bankAccounts")
export class BankTransfersController {
  constructor(private readonly bankTransfersService: BankTransfersService) {}

  @Post()
  @Permissions("accounting_write")
  async createTransfer(
    @Param("accountId") accountId: string,
    @Body() dto: CreateBankTransferDto,
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const result = await this.bankTransfersService.createTransfer(
      tenantId,
      userId,
      accountId,
      dto,
    );

    return {
      success: true,
      data: result,
    };
  }
}
