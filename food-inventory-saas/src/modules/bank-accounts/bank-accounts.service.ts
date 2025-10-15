import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BankAccount, BankAccountDocument } from '../../schemas/bank-account.schema';
import { CreateBankAccountDto, UpdateBankAccountDto, AdjustBalanceDto } from '../../dto/bank-account.dto';

@Injectable()
export class BankAccountsService {
  private readonly logger = new Logger(BankAccountsService.name);

  constructor(
    @InjectModel(BankAccount.name)
    private bankAccountModel: Model<BankAccountDocument>,
  ) {}

  async create(createBankAccountDto: CreateBankAccountDto, tenantId: string): Promise<BankAccount> {
    const newBankAccount = new this.bankAccountModel({
      ...createBankAccountDto,
      tenantId: this.normalizeTenantValue(tenantId),
      currentBalance: createBankAccountDto.initialBalance,
    });

    this.logger.log(`Creating bank account for tenant ${tenantId}: ${createBankAccountDto.bankName} - ${createBankAccountDto.accountNumber}`);
    return newBankAccount.save();
  }

  async findAll(tenantId: string, includeInactive: boolean = false): Promise<BankAccount[]> {
    const filter: any = { tenantId: this.buildTenantFilter(tenantId) };

    if (!includeInactive) {
      filter.isActive = true;
    }

    return this.bankAccountModel
      .find(filter)
      .sort({ bankName: 1, accountNumber: 1 })
      .exec();
  }

  async findOne(id: string, tenantId: string): Promise<BankAccount> {
    const accountId = this.toObjectIdIfValid(id) ?? id;
    const tenantFilter = this.buildTenantFilter(tenantId);

    const bankAccount = await this.bankAccountModel
      .findOne({ _id: accountId, tenantId: tenantFilter })
      .exec();

    if (!bankAccount) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    return bankAccount;
  }

  async update(id: string, updateBankAccountDto: UpdateBankAccountDto, tenantId: string): Promise<BankAccount> {
    const accountId = this.toObjectIdIfValid(id) ?? id;
    const tenantFilter = this.buildTenantFilter(tenantId);

    const updated = await this.bankAccountModel
      .findOneAndUpdate(
        { _id: accountId, tenantId: tenantFilter },
        updateBankAccountDto,
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    this.logger.log(`Updating bank account ${id} for tenant ${tenantId}`);
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

  async adjustBalance(id: string, adjustBalanceDto: AdjustBalanceDto, tenantId: string): Promise<BankAccount> {
    const bankAccount = await this.findOne(id, tenantId);

    const adjustment = adjustBalanceDto.type === 'increase'
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
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    this.logger.log(`Adjusting balance for bank account ${id}: ${adjustBalanceDto.type} ${adjustBalanceDto.amount}. Reason: ${adjustBalanceDto.reason}`);
    return updated;
  }

  async updateBalance(id: string, amount: number, tenantId: string): Promise<BankAccount> {
    const bankAccount = await this.findOne(id, tenantId);

    const updated = await this.bankAccountModel
      .findOneAndUpdate(
        {
          _id: this.toObjectIdIfValid(id) ?? id,
          tenantId: this.buildTenantFilter(tenantId),
        },
        { $inc: { currentBalance: amount } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    return updated;
  }

  async getTotalBalance(tenantId: string, currency?: string): Promise<number> {
    const filter: any = {
      tenantId: this.buildTenantFilter(tenantId),
      isActive: true
    };

    if (currency) {
      filter.currency = currency;
    }

    const accounts = await this.bankAccountModel.find(filter).exec();
    return accounts.reduce((total, account) => total + account.currentBalance, 0);
  }

  async getBalancesByCurrency(tenantId: string): Promise<Record<string, number>> {
    const accounts = await this.bankAccountModel
      .find({ tenantId: this.buildTenantFilter(tenantId), isActive: true })
      .exec();

    const balances: Record<string, number> = {};

    accounts.forEach(account => {
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

 }
