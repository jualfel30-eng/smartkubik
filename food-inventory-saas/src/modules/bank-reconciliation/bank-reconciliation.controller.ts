import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import type { Express } from "express";
import {
  ImportBankStatementDto,
  ManualReconcileDto,
  MatchStatementTransactionDto,
  ReconciliationSummaryDto,
  UnmatchStatementTransactionDto,
} from "../../dto/bank-reconciliation.dto";
import { BankReconciliationService } from "./bank-reconciliation.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { ModuleAccessGuard } from "../../guards/module-access.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { RequireModule } from "../../decorators/require-module.decorator";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, ModuleAccessGuard)
@RequireModule("bankAccounts")
export class BankReconciliationController {
  constructor(
    private readonly bankReconciliationService: BankReconciliationService,
  ) {}

  @Post("bank-reconciliation/import")
  @Permissions("accounting_write")
  @UseInterceptors(FileInterceptor("file"))
  async importStatementFile(
    @Body() dto: ImportBankStatementDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const result = await this.bankReconciliationService.importStatement(
      dto,
      file,
      req.user.tenantId,
      req.user,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post("bank-reconciliation/manual")
  @Permissions("accounting_write")
  async manualReconcile(@Body() dto: ManualReconcileDto, @Request() req) {
    const transaction = await this.bankReconciliationService.manualReconcile(
      dto,
      req.user.tenantId,
      req.user,
    );
    return {
      success: true,
      data: transaction,
    };
  }

  @Get("bank-reconciliation/statement/:statementId")
  @Permissions("accounting_read")
  async getImportedStatement(
    @Param("statementId") statementId: string,
    @Request() req,
  ) {
    const result = await this.bankReconciliationService.findStatementDetails(
      statementId,
      req.user.tenantId,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post("bank-accounts/:accountId/statements/import")
  @Permissions("accounting_write")
  async importStatement(
    @Param("accountId") accountId: string,
    @Body() dto: ImportBankStatementDto,
    @Request() req,
  ) {
    const statement = await this.bankReconciliationService.createBankStatement(
      req.user.tenantId,
      accountId,
      dto,
      req.user.id,
    );
    return {
      success: true,
      message: "Bank statement imported",
      data: statement,
    };
  }

  @Get("bank-accounts/:accountId/statements")
  @Permissions("accounting_read")
  async listStatements(
    @Param("accountId") accountId: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
    @Request() req,
  ) {
    const result = await this.bankReconciliationService.listBankStatements(
      req.user.tenantId,
      accountId,
      Number(page),
      Number(limit),
    );
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get("bank-accounts/:accountId/statements/:statementId")
  @Permissions("accounting_read")
  async getStatement(
    @Param("statementId") statementId: string,
    @Request() req,
  ) {
    const statement = await this.bankReconciliationService.getBankStatement(
      req.user.tenantId,
      statementId,
    );
    return {
      success: true,
      data: statement,
    };
  }

  @Post("bank-reconciliation/:statementId/start")
  @Permissions("accounting_write")
  async startReconciliation(
    @Param("statementId") statementId: string,
    @Request() req,
  ) {
    const reconciliation =
      await this.bankReconciliationService.startReconciliation(
        req.user.tenantId,
        statementId,
        req.user.id,
      );
    return {
      success: true,
      data: reconciliation,
    };
  }

  @Get("bank-reconciliation/:reconciliationId")
  @Permissions("accounting_read")
  async getReconciliation(
    @Param("reconciliationId") reconciliationId: string,
    @Request() req,
  ) {
    const reconciliation =
      await this.bankReconciliationService.getReconciliation(
        req.user.tenantId,
        reconciliationId,
      );
    return {
      success: true,
      data: reconciliation,
    };
  }

  @Post("bank-reconciliation/:reconciliationId/match")
  @Permissions("accounting_write")
  async matchTransaction(
    @Param("reconciliationId") reconciliationId: string,
    @Body() dto: MatchStatementTransactionDto,
    @Request() req,
  ) {
    await this.bankReconciliationService.matchTransaction(
      req.user.tenantId,
      reconciliationId,
      dto,
      req.user.id,
    );
    return { success: true };
  }

  @Post("bank-reconciliation/:reconciliationId/unmatch")
  @Permissions("accounting_write")
  async unmatchTransaction(
    @Param("reconciliationId") reconciliationId: string,
    @Body() dto: UnmatchStatementTransactionDto,
    @Request() req,
  ) {
    await this.bankReconciliationService.unmatchTransaction(
      req.user.tenantId,
      reconciliationId,
      dto.statementTransactionId,
    );
    return { success: true };
  }

  @Post("bank-reconciliation/:reconciliationId/complete")
  @Permissions("accounting_write")
  async completeReconciliation(
    @Param("reconciliationId") reconciliationId: string,
    @Body() summary: ReconciliationSummaryDto,
    @Request() req,
  ) {
    await this.bankReconciliationService.completeReconciliation(
      req.user.tenantId,
      reconciliationId,
      req.user.id,
      summary,
    );
    return { success: true };
  }
}
