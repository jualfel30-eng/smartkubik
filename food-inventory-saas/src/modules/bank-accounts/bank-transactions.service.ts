import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BankTransaction,
  BankTransactionDocument,
} from '../../schemas/bank-transaction.schema';
import {
  CreateBankTransactionDto,
  BankTransactionQueryDto,
  RecordPaymentMovementDto,
  CreateBankTransferDto,
} from '../../dto/bank-transaction.dto';

@Injectable()
export class BankTransactionsService {
  private readonly logger = new Logger(BankTransactionsService.name);

  constructor(
    @InjectModel(BankTransaction.name)
    private readonly bankTransactionModel: Model<BankTransactionDocument>,
  ) {}

  async findById(
    tenantId: string,
    transactionId: string,
  ): Promise<BankTransactionDocument | null> {
    return this.bankTransactionModel
      .findOne({
        _id: transactionId,
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();
  }

  async createTransaction(
    tenantId: string,
    bankAccountId: string,
    dto: CreateBankTransactionDto,
    createdBy?: string,
    balanceAfter?: number,
    extra: Partial<BankTransaction> = {},
  ): Promise<BankTransactionDocument> {
    const transactionDate = dto.transactionDate
      ? new Date(dto.transactionDate)
      : new Date();

    const base: Partial<BankTransaction> = {
      tenantId: new Types.ObjectId(tenantId),
      bankAccountId: new Types.ObjectId(bankAccountId),
      type: dto.type,
      channel: dto.channel,
      method: dto.method,
      amount: dto.amount,
      balanceAfter,
      description: dto.description,
      reference: dto.reference,
      counterpart: dto.counterpart as any,
      transactionDate,
      bookingDate: extra.bookingDate ?? new Date(),
      metadata: dto.metadata ?? {},
      reconciliationStatus: extra.reconciliationStatus ?? 'pending',
    };

    if (createdBy) {
      base.createdBy = new Types.ObjectId(createdBy);
    }

    const transaction = new this.bankTransactionModel({
      ...base,
      ...extra,
    });

    await transaction.save();
    this.logger.log(
      `Recorded ${transaction.type} transaction of ${transaction.amount} on account ${transaction.bankAccountId}`,
    );
    return transaction;
  }

  async recordPaymentMovement(
    tenantId: string,
    userId: string,
    payload: RecordPaymentMovementDto & { balanceAfter: number },
  ): Promise<BankTransactionDocument> {
    const type = payload.paymentType === 'sale' ? 'credit' : 'debit';
    const channel = this.mapPaymentMethodToChannel(payload.method);

    return this.createTransaction(
      tenantId,
      payload.bankAccountId,
      {
        type,
        channel,
        method: payload.method,
        amount: payload.amount,
        description:
          payload.description ??
          (type === 'credit'
            ? `Pago recibido (${payload.method})`
            : `Pago a proveedor (${payload.method})`),
        reference: payload.reference,
        transactionDate: payload.transactionDate,
        metadata: payload.metadata,
      },
      userId,
      payload.balanceAfter,
      {
        paymentId: new Types.ObjectId(payload.paymentId),
        reconciliationStatus: 'pending',
      },
    );
  }

  async markAsReconciled(
    transactionId: string,
    reconciliationId: string,
    statementTransactionId: string,
    userId: string,
  ): Promise<void> {
    await this.bankTransactionModel.findByIdAndUpdate(
      transactionId,
      {
        $set: {
          reconciliationStatus: 'matched',
          reconciliationId: new Types.ObjectId(reconciliationId),
          statementTransactionId: new Types.ObjectId(statementTransactionId),
          'metadata.reconciledBy': userId,
          'metadata.reconciledAt': new Date(),
          reconciled: true,
          reconciledAt: new Date(),
          importedFrom: 'statement',
        },
      },
    );
  }

  async markAsPending(transactionId: string): Promise<void> {
    await this.bankTransactionModel.findByIdAndUpdate(transactionId, {
      $set: {
        reconciliationStatus: 'pending',
        reconciled: false,
      },
      $unset: {
        reconciliationId: 1,
        statementTransactionId: 1,
        'metadata.reconciledBy': 1,
        'metadata.reconciledAt': 1,
        reconciledAt: 1,
        importedFrom: 1,
      },
    });
  }

  async createTransfer(
    tenantId: string,
    sourceAccountId: string,
    destinationAccountId: string,
    dto: CreateBankTransferDto,
    userId: string,
    sourceBalanceAfter: number,
    destinationBalanceAfter: number,
  ) {
    const transferGroupId = `TRF-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2, 8)}`;

    const baseMetadata = {
      transferGroupId,
      destinationAccountId,
      sourceAccountId,
      note: dto.metadataNote,
    };

    const debit = await this.createTransaction(
      tenantId,
      sourceAccountId,
      {
        type: 'debit',
        channel: 'transferencia',
        amount: dto.amount,
        description:
          dto.description || `Transferencia a cuenta ${destinationAccountId}`,
        reference: dto.reference,
        metadata: {
          ...baseMetadata,
          direction: 'out',
        },
      },
      userId,
      sourceBalanceAfter,
      {
        transferGroupId,
      },
    );

    const credit = await this.createTransaction(
      tenantId,
      destinationAccountId,
      {
        type: 'credit',
        channel: 'transferencia',
        amount: dto.amount,
        description:
          dto.description || `Transferencia desde cuenta ${sourceAccountId}`,
        reference: dto.reference,
        metadata: {
          ...baseMetadata,
          direction: 'in',
        },
      },
      userId,
      destinationBalanceAfter,
      {
        transferGroupId,
      },
    );

    await this.bankTransactionModel.findByIdAndUpdate(debit._id, {
      $set: {
        transferGroupId,
        'metadata.counterpartTransactionId': credit._id,
      },
    });

    await this.bankTransactionModel.findByIdAndUpdate(credit._id, {
      $set: {
        transferGroupId,
        'metadata.counterpartTransactionId': debit._id,
      },
    });

    return { debit, credit, transferGroupId };
  }

  async listTransactions(
    tenantId: string,
    bankAccountId: string,
    query: BankTransactionQueryDto,
  ) {
    const filter: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      bankAccountId: new Types.ObjectId(bankAccountId),
    };

    if (query.type) {
      filter.type = query.type;
    }
    if (query.channel) {
      filter.channel = query.channel;
    }
    if (query.reconciliationStatus) {
      filter.reconciliationStatus = query.reconciliationStatus;
    }
    if (query.from || query.to) {
      filter.transactionDate = {};
      if (query.from) {
        filter.transactionDate.$gte = new Date(query.from);
      }
      if (query.to) {
        filter.transactionDate.$lte = new Date(query.to);
      }
    }
    if (query.search) {
      filter.$or = [
        { description: { $regex: query.search, $options: 'i' } },
        { reference: { $regex: query.search, $options: 'i' } },
        { 'counterpart.name': { $regex: query.search, $options: 'i' } },
      ];
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 25;
    const skip = (page - 1) * limit;

    const sortField = query.sortField ?? 'transactionDate';
    const sortOrder: 1 | -1 = query.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };
    if (sortField !== 'createdAt') {
      sort.createdAt = -1;
    }

    const [data, total] = await Promise.all([
      this.bankTransactionModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.bankTransactionModel.countDocuments(filter),
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

  private mapPaymentMethodToChannel(method: string): string {
    if (!method) {
      return 'otros';
    }
    const normalized = method.toLowerCase();
    if (normalized.includes('pago_movil')) return 'pago_movil';
    if (normalized.includes('transferencia')) return 'transferencia';
    if (
      normalized.includes('pos') ||
      normalized.includes('tarjeta') ||
      normalized.includes('punto')
    )
      return 'pos';
    if (normalized.includes('cash') || normalized.includes('efectivo'))
      return 'otros';
    if (normalized.includes('zelle') || normalized.includes('paypal'))
      return 'otros';
    return 'otros';
  }
}
