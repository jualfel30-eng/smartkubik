import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import type { Express } from "express";
import {
  BankStatement,
  BankStatementDocument,
} from "../../schemas/bank-statement.schema";
import {
  BankReconciliation,
  BankReconciliationDocument,
} from "../../schemas/bank-reconciliation.schema";
import {
  JournalEntry,
  JournalEntryDocument,
} from "../../schemas/journal-entry.schema";
import {
  ImportBankStatementDto,
  ManualReconcileDto,
  MatchStatementTransactionDto,
  ReconciliationSummaryDto,
} from "../../dto/bank-reconciliation.dto";
import { BankTransactionsService } from "../bank-accounts/bank-transactions.service";
import {
  BankTransaction,
  BankTransactionDocument,
} from "../../schemas/bank-transaction.schema";
import {
  BankStatementImport,
  BankStatementImportDocument,
} from "../../schemas/bank-statement-import.schema";
import { FEATURES } from "../../config/features.config";
import { parseBankStatement } from "../../utils/bank-statement.parser";
import { BankAccountsService } from "../bank-accounts/bank-accounts.service";

@Injectable()
export class BankReconciliationService {
  constructor(
    @InjectModel(BankStatement.name)
    private bankStatementModel: Model<BankStatementDocument>,
    @InjectModel(BankReconciliation.name)
    private bankReconciliationModel: Model<BankReconciliationDocument>,
    @InjectModel(JournalEntry.name)
    private journalEntryModel: Model<JournalEntryDocument>,
    @InjectModel(BankTransaction.name)
    private bankTransactionModel: Model<BankTransactionDocument>,
    @InjectModel(BankStatementImport.name)
    private statementImportModel: Model<BankStatementImportDocument>,
    private readonly bankTransactionsService: BankTransactionsService,
    private readonly bankAccountsService: BankAccountsService,
  ) {}

  async importStatement(
    dto: ImportBankStatementDto,
    file: Express.Multer.File,
    tenantId: string,
  ) {
    if (!FEATURES.BANK_ACCOUNTS_RECONCILIATION) {
      throw new BadRequestException("Bank reconciliation feature disabled");
    }

    if (!file) {
      throw new BadRequestException(
        "No file provided for bank statement import",
      );
    }

    if (!dto.bankAccountId) {
      throw new BadRequestException("bankAccountId is required");
    }

    const rows = await parseBankStatement(file);
    if (!rows.length) {
      throw new BadRequestException(
        "El archivo no contiene movimientos válidos",
      );
    }

    const bankAccountId = dto.bankAccountId;
    const bankAccountObjectId = new Types.ObjectId(bankAccountId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    const statementImport = await this.statementImportModel.create({
      bankAccountId: bankAccountObjectId,
      tenantId: tenantObjectId,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      totalRows: rows.length,
      metadata: {
        statementDate: dto.statementDate,
        startingBalance: dto.startingBalance,
        endingBalance: dto.endingBalance,
        currency: dto.currency ?? "VES",
      },
    });

    const unmatched: Array<Record<string, any>> = [];
    let matchedRows = 0;

    for (const row of rows) {
      const transactionDate = new Date(row.transactionDate);
      const transaction = await this.bankTransactionModel.findOne({
        bankAccountId: bankAccountObjectId,
        tenantId: tenantObjectId,
        amount: row.amount,
        transactionDate,
        reconciled: { $ne: true },
      });

      if (transaction) {
        transaction.reconciled = true;
        transaction.reconciledAt = new Date();
        transaction.importedFrom = "statement";
        transaction.statementImportId = statementImport._id;
        transaction.metadata = {
          ...(transaction.metadata ?? {}),
          bankReference: row.reference ?? transaction.metadata?.bankReference,
          bankDescription:
            row.description ?? transaction.metadata?.bankDescription,
        };
        transaction.reconciliationStatus = "matched";
        await transaction.save();
        matchedRows += 1;
      } else {
        unmatched.push({
          statementImportId: statementImport._id,
          transactionDate: transactionDate.toISOString(),
          amount: row.amount,
          description: row.description,
          reference: row.reference,
        });
      }
    }

    statementImport.matchedRows = matchedRows;
    statementImport.unmatchedRows = unmatched.length;
    statementImport.metadata = {
      ...(statementImport.metadata ?? {}),
      unmatched,
    };
    await statementImport.save();

    const parsedEndingBalance = Number(dto.endingBalance);
    if (Number.isFinite(parsedEndingBalance)) {
      await this.bankAccountsService.setCurrentBalance(
        bankAccountId,
        parsedEndingBalance,
        tenantId,
        undefined,
        {},
      );
    }

    return {
      statementImport,
      unmatched,
    };
  }

  async manualReconcile(dto: ManualReconcileDto, tenantId: string) {
    const transaction = await this.bankTransactionModel.findOne({
      _id: new Types.ObjectId(dto.transactionId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!transaction) {
      throw new NotFoundException("Transacción no encontrada");
    }

    transaction.reconciled = true;
    transaction.reconciledAt = new Date();
    transaction.reconciliationStatus = "manually_matched";
    if (dto.statementImportId) {
      transaction.statementImportId = new Types.ObjectId(dto.statementImportId);
    }
    if (dto.statementTransactionId) {
      transaction.statementTransactionId = new Types.ObjectId(
        dto.statementTransactionId,
      );
    }
    transaction.metadata = {
      ...(transaction.metadata ?? {}),
      bankAmount: dto.bankAmount,
      bankReference: dto.bankReference ?? transaction.metadata?.bankReference,
      bankDate: dto.bankDate,
      reconciledManually: true,
    };

    await transaction.save();

    if (transaction.statementImportId) {
      const statementImport = await this.statementImportModel.findById(
        transaction.statementImportId,
      );

      if (statementImport) {
        statementImport.matchedRows = (statementImport.matchedRows ?? 0) + 1;
        statementImport.unmatchedRows = Math.max(
          (statementImport.unmatchedRows ?? 1) - 1,
          0,
        );

        if (Array.isArray(statementImport.metadata?.unmatched)) {
          statementImport.metadata.unmatched =
            statementImport.metadata.unmatched.filter((item: any) => {
              const sameAmount =
                Number(item.amount ?? 0) === Number(dto.bankAmount ?? 0);
              const sameReference =
                (item.reference ?? "") === (dto.bankReference ?? "");
              const itemDate = item.transactionDate
                ? new Date(item.transactionDate).toISOString()
                : "";
              const payloadDate = dto.bankDate
                ? new Date(dto.bankDate).toISOString()
                : "";

              return !(sameAmount && sameReference && itemDate === payloadDate);
            });
        }

        await statementImport.save();
      }
    }

    return transaction;
  }

  async findStatementDetails(statementId: string, tenantId: string) {
    const statement = await this.statementImportModel
      .findOne({
        _id: new Types.ObjectId(statementId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean();

    if (!statement) {
      throw new NotFoundException("Estado de cuenta importado no encontrado");
    }

    const transactions = await this.bankTransactionModel
      .find({ statementImportId: new Types.ObjectId(statementId) })
      .sort({ transactionDate: -1 })
      .lean();

    return {
      statement,
      transactions,
    };
  }

  async createBankStatement(
    tenantId: string,
    bankAccountId: string,
    dto: ImportBankStatementDto,
    createdBy?: string,
  ): Promise<BankStatementDocument> {
    const transactions = (dto.transactions ?? []).map((tx) => ({
      date: new Date(tx.date),
      description: tx.description,
      amount: tx.amount,
      type: tx.type ?? (tx.amount >= 0 ? "credit" : "debit"),
      reference: tx.reference,
      status: "unmatched",
    }));

    const statement = new this.bankStatementModel({
      tenantId: new Types.ObjectId(tenantId),
      bankAccountId: new Types.ObjectId(bankAccountId),
      statementDate: new Date(dto.statementDate),
      startingBalance: dto.startingBalance,
      endingBalance: dto.endingBalance,
      currency: dto.currency ?? "VES",
      importSource: dto.importSource ?? "manual",
      fileName: dto.fileName,
      status: "imported",
      createdBy: createdBy ? new Types.ObjectId(createdBy) : undefined,
      transactions,
    });

    return statement.save();
  }

  async listBankStatements(
    tenantId: string,
    bankAccountId: string,
    page = 1,
    limit = 20,
  ) {
    const filter = {
      tenantId: new Types.ObjectId(tenantId),
      bankAccountId: new Types.ObjectId(bankAccountId),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.bankStatementModel
        .find(filter)
        .sort({ statementDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.bankStatementModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBankStatement(
    tenantId: string,
    statementId: string,
  ): Promise<BankStatementDocument> {
    const statement = await this.bankStatementModel
      .findOne({
        _id: statementId,
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean()
      .exec();
    if (!statement) {
      throw new NotFoundException("Bank statement not found");
    }
    return statement as BankStatementDocument;
  }

  async startReconciliation(
    tenantId: string,
    statementId: string,
    userId: string,
  ): Promise<BankReconciliationDocument> {
    const statement = await this.bankStatementModel.findOne({
      _id: statementId,
      tenantId: new Types.ObjectId(tenantId),
    });
    if (!statement) {
      throw new NotFoundException("Bank statement not found");
    }

    if (statement.status === "reconciling") {
      const existing = await this.bankReconciliationModel
        .findOne({ bankStatementId: statement._id, status: "in_progress" })
        .exec();
      if (existing) {
        return existing;
      }
    }

    const reconciliation = new this.bankReconciliationModel({
      tenantId: statement.tenantId,
      bankStatementId: statement._id,
      bankAccountId: statement.bankAccountId,
      reconciliationDate: new Date(),
      closingBalance: statement.endingBalance,
      clearedTransactions: [],
      outstandingTransactions: [],
      status: "in_progress",
      startedBy: new Types.ObjectId(userId),
      summary: {
        totalTransactions: statement.transactions.length,
        matched: 0,
        outstanding: statement.transactions.length,
      },
    });

    statement.status = "reconciling";
    await statement.save();
    return reconciliation.save();
  }

  async getReconciliation(
    tenantId: string,
    reconciliationId: string,
  ): Promise<BankReconciliationDocument> {
    const reconciliation = await this.bankReconciliationModel
      .findOne({
        _id: reconciliationId,
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean()
      .exec();

    if (!reconciliation) {
      throw new NotFoundException("Reconciliation not found");
    }

    return reconciliation as BankReconciliationDocument;
  }

  async matchTransaction(
    tenantId: string,
    reconciliationId: string,
    dto: MatchStatementTransactionDto,
    userId: string,
  ): Promise<void> {
    const reconciliation = await this.bankReconciliationModel.findOne({
      _id: reconciliationId,
      tenantId: new Types.ObjectId(tenantId),
    });
    if (!reconciliation) {
      throw new NotFoundException("Reconciliation not found");
    }

    if (reconciliation.status !== "in_progress") {
      throw new BadRequestException("Reconciliation is not in progress");
    }

    const statement = await this.bankStatementModel.findById(
      reconciliation.bankStatementId,
    );
    if (!statement) {
      throw new NotFoundException("Bank statement not found");
    }

    const transaction = statement.transactions.find((t) =>
      new Types.ObjectId(t["_id"]).equals(dto.statementTransactionId),
    );
    if (!transaction) {
      throw new NotFoundException("Statement transaction not found");
    }

    const bankTransaction = await this.bankTransactionsService.findById(
      tenantId,
      dto.bankTransactionId,
    );
    if (!bankTransaction) {
      throw new NotFoundException("Bank transaction not found");
    }

    await this.bankTransactionsService.markAsReconciled(
      bankTransaction._id.toString(),
      reconciliation._id.toString(),
      dto.statementTransactionId,
      userId,
    );

    transaction.status = "matched";
    transaction.bankTransactionId = bankTransaction._id;
    await statement.save();

    reconciliation.clearedTransactions.push(bankTransaction._id);
    reconciliation.summary = reconciliation.summary ?? {};
    reconciliation.summary.matched = (reconciliation.summary.matched ?? 0) + 1;
    reconciliation.summary.outstanding =
      (reconciliation.summary.outstanding ?? statement.transactions.length) - 1;

    await reconciliation.save();
  }

  async unmatchTransaction(
    tenantId: string,
    reconciliationId: string,
    statementTransactionId: string,
  ): Promise<void> {
    const reconciliation = await this.bankReconciliationModel.findOne({
      _id: reconciliationId,
      tenantId: new Types.ObjectId(tenantId),
    });
    if (!reconciliation) {
      throw new NotFoundException("Reconciliation not found");
    }

    const statement = await this.bankStatementModel.findById(
      reconciliation.bankStatementId,
    );
    if (!statement) {
      throw new NotFoundException("Bank statement not found");
    }

    const transaction = statement.transactions.find((t) =>
      new Types.ObjectId(t["_id"]).equals(statementTransactionId),
    );
    if (!transaction) {
      throw new NotFoundException("Statement transaction not found");
    }

    if (!transaction.bankTransactionId) {
      return;
    }

    await this.bankTransactionsService.markAsPending(
      transaction.bankTransactionId.toString(),
    );

    reconciliation.clearedTransactions =
      reconciliation.clearedTransactions.filter(
        (id) => !id.equals(transaction.bankTransactionId!),
      );
    reconciliation.summary = reconciliation.summary ?? {};
    reconciliation.summary.matched = Math.max(
      (reconciliation.summary.matched ?? 1) - 1,
      0,
    );
    reconciliation.summary.outstanding =
      (reconciliation.summary.outstanding ?? 0) + 1;

    transaction.status = "unmatched";
    transaction.bankTransactionId = undefined;
    await statement.save();
    await reconciliation.save();
  }

  async completeReconciliation(
    tenantId: string,
    reconciliationId: string,
    userId: string,
    summary?: ReconciliationSummaryDto,
  ): Promise<void> {
    const reconciliation = await this.bankReconciliationModel.findOne({
      _id: reconciliationId,
      tenantId: new Types.ObjectId(tenantId),
    });
    if (!reconciliation) {
      throw new NotFoundException("Reconciliation not found");
    }

    reconciliation.status = "completed";
    reconciliation.completedBy = new Types.ObjectId(userId);
    reconciliation.completedAt = new Date();
    reconciliation.summary = {
      ...(reconciliation.summary ?? {}),
      ...(summary ?? {}),
    };
    await reconciliation.save();

    await this.bankStatementModel.updateOne(
      { _id: reconciliation.bankStatementId },
      { $set: { status: "reconciled" } },
    );
  }
}
