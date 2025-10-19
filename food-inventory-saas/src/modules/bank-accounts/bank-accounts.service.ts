import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model, Types } from "mongoose";
import {
  BankAccount,
  BankAccountDocument,
} from "../../schemas/bank-account.schema";
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
  AdjustBalanceDto,
} from "../../dto/bank-account.dto";
import { BankAlertsService } from "./bank-alerts.service";

@Injectable()
export class BankAccountsService {
  private readonly logger = new Logger(BankAccountsService.name);

  constructor(
    @InjectModel(BankAccount.name)
    private bankAccountModel: Model<BankAccountDocument>,
    private readonly bankAlertsService: BankAlertsService,
  ) {}

  async create(
    createBankAccountDto: CreateBankAccountDto,
    tenantId: string,
  ): Promise<BankAccount> {
    const newBankAccount = new this.bankAccountModel({
      ...createBankAccountDto,
      tenantId: this.normalizeTenantValue(tenantId),
      currentBalance: createBankAccountDto.initialBalance,
      alertEnabled: createBankAccountDto.alertEnabled ?? false,
      minimumBalance: createBankAccountDto.minimumBalance ?? null,
    });

    this.logger.log(
      `Creating bank account for tenant ${tenantId}: ${createBankAccountDto.bankName} - ${createBankAccountDto.accountNumber}`,
    );
    const saved = await newBankAccount.save();
    await this.evaluateAlerts(saved, tenantId);
    return saved;
  }

  async findAll(
    tenantId: string,
    includeInactive: boolean = false,
  ): Promise<BankAccount[]> {
    const filter: any = { tenantId: this.buildTenantFilter(tenantId) };

    if (!includeInactive) {
      filter.isActive = true;
    }

    return this.bankAccountModel
      .find(filter)
      .sort({ bankName: 1, accountNumber: 1 })
      .exec();
  }

  async findOne(
    id: string,
    tenantId: string,
    session?: ClientSession,
  ): Promise<BankAccount> {
    const accountId = this.toObjectIdIfValid(id) ?? id;
    const tenantFilter = this.buildTenantFilter(tenantId);

    const bankAccount = await this.bankAccountModel
      .findOne({ _id: accountId, tenantId: tenantFilter })
      .session(session ?? null)
      .exec();

    if (!bankAccount) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    return bankAccount;
  }

  async update(
    id: string,
    updateBankAccountDto: UpdateBankAccountDto,
    tenantId: string,
  ): Promise<BankAccount> {
    const accountId = this.toObjectIdIfValid(id) ?? id;
    const tenantFilter = this.buildTenantFilter(tenantId);

    const updatePayload: Record<string, any> = { ...updateBankAccountDto };

    if (
      typeof updateBankAccountDto.alertEnabled === "boolean" &&
      !updateBankAccountDto.alertEnabled
    ) {
      updatePayload.lastAlertSentAt = null;
    }

    if (updateBankAccountDto.minimumBalance === null) {
      updatePayload.lastAlertSentAt = null;
    }

    const updated = await this.bankAccountModel
      .findOneAndUpdate(
        { _id: accountId, tenantId: tenantFilter },
        updatePayload,
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    this.logger.log(`Updating bank account ${id} for tenant ${tenantId}`);
    await this.evaluateAlerts(updated, tenantId);
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const accountId = this.toObjectIdIfValid(id) ?? id;
    const tenantFilter = this.buildTenantFilter(tenantId);

    const result = await this.bankAccountModel
      .deleteOne({ _id: accountId, tenantId: tenantFilter })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    this.logger.log(`Deleted bank account ${id} for tenant ${tenantId}`);
  }

  async adjustBalance(
    id: string,
    adjustBalanceDto: AdjustBalanceDto,
    tenantId: string,
    session?: ClientSession,
    options: { userId?: string } = {},
  ): Promise<BankAccount> {
    const bankAccount = await this.findOne(id, tenantId, session);

    const adjustment =
      adjustBalanceDto.type === "increase"
        ? adjustBalanceDto.amount
        : -adjustBalanceDto.amount;

    const newBalance = bankAccount.currentBalance + adjustment;

    const updated = await this.bankAccountModel
      .findOneAndUpdate(
        {
          _id: this.toObjectIdIfValid(id) ?? id,
          tenantId: this.buildTenantFilter(tenantId),
        },
        { currentBalance: newBalance },
        { new: true },
      )
      .session(session ?? null)
      .exec();

    if (!updated) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    this.logger.log(
      `Adjusting balance for bank account ${id}: ${adjustBalanceDto.type} ${adjustBalanceDto.amount}. Reason: ${adjustBalanceDto.reason}`,
    );
    await this.evaluateAlerts(updated, tenantId, options.userId);
    return updated;
  }

  async updateBalance(
    id: string,
    amount: number,
    tenantId: string,
    session?: ClientSession,
    options: { userId?: string } = {},
  ): Promise<BankAccount> {
    await this.findOne(id, tenantId, session);

    const updated = await this.bankAccountModel
      .findOneAndUpdate(
        {
          _id: this.toObjectIdIfValid(id) ?? id,
          tenantId: this.buildTenantFilter(tenantId),
        },
        { $inc: { currentBalance: amount } },
        { new: true },
      )
      .session(session ?? null)
      .exec();

    if (!updated) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    await this.evaluateAlerts(updated, tenantId, options.userId);
    return updated;
  }

  async setCurrentBalance(
    id: string,
    newBalance: number,
    tenantId: string,
    session?: ClientSession,
    options: { userId?: string } = {},
  ): Promise<BankAccount> {
    if (!Number.isFinite(newBalance)) {
      throw new Error("Invalid balance value provided");
    }

    const updated = await this.bankAccountModel
      .findOneAndUpdate(
        {
          _id: this.toObjectIdIfValid(id) ?? id,
          tenantId: this.buildTenantFilter(tenantId),
        },
        { currentBalance: newBalance },
        { new: true },
      )
      .session(session ?? null)
      .exec();

    if (!updated) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    this.logger.log(
      `Set current balance for bank account ${id} to ${newBalance}`,
    );
    await this.evaluateAlerts(updated, tenantId, options.userId);
    return updated;
  }

  async getTotalBalance(tenantId: string, currency?: string): Promise<number> {
    const filter: any = {
      tenantId: this.buildTenantFilter(tenantId),
      isActive: true,
    };

    if (currency) {
      filter.currency = currency;
    }

    const accounts = await this.bankAccountModel.find(filter).exec();
    return accounts.reduce(
      (total, account) => total + account.currentBalance,
      0,
    );
  }

  async getBalancesByCurrency(
    tenantId: string,
  ): Promise<Record<string, number>> {
    const accounts = await this.bankAccountModel
      .find({ tenantId: this.buildTenantFilter(tenantId), isActive: true })
      .exec();

    const balances: Record<string, number> = {};

    accounts.forEach((account) => {
      if (!balances[account.currency]) {
        balances[account.currency] = 0;
      }
      balances[account.currency] += account.currentBalance;
    });

    return balances;
  }

  private toObjectIdIfValid(id: string | Types.ObjectId) {
    if (id instanceof Types.ObjectId) {
      return id;
    }
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined;
  }

  private normalizeTenantValue(tenantId: string | Types.ObjectId) {
    const objectId = this.toObjectIdIfValid(tenantId);
    return objectId ?? tenantId;
  }

  private buildTenantFilter(tenantId: string | Types.ObjectId) {
    const objectId = this.toObjectIdIfValid(tenantId);
    if (objectId) {
      return { $in: [objectId, objectId.toHexString()] };
    }
    return tenantId;
  }

  private async evaluateAlerts(
    account: BankAccountDocument,
    tenantId: string,
    userId?: string,
  ): Promise<void> {
    if (!account) {
      return;
    }

    try {
      await this.bankAlertsService.evaluateBalance(account, tenantId, {
        userId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to evaluate alerts for bank account ${account._id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
