import { Injectable, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChartOfAccounts, ChartOfAccountsDocument } from '../../schemas/chart-of-accounts.schema';
import { JournalEntry, JournalEntryDocument } from '../../schemas/journal-entry.schema';
import { CreateChartOfAccountDto, CreateJournalEntryDto } from '../../dto/accounting.dto';
import { OrderDocument, OrderPayment } from '../../schemas/order.schema';

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    @InjectModel(ChartOfAccounts.name) private chartOfAccountsModel: Model<ChartOfAccountsDocument>,
    @InjectModel(JournalEntry.name) private journalEntryModel: Model<JournalEntryDocument>,
  ) {}

  private async generateNextCode(type: string, tenantId: string): Promise<string> {
    const typePrefix = {
      'Activo': '1',
      'Pasivo': '2',
      'Patrimonio': '3',
      'Ingreso': '4',
      'Gasto': '5',
    }[type];

    if (!typePrefix) {
      throw new InternalServerErrorException(`Prefijo de tipo de cuenta inválido: ${type}`);
    }

    const lastAccount = await this.chartOfAccountsModel.findOne(
      { tenantId, code: { $regex: `^${typePrefix}` } },
      { code: 1 },
      { sort: { code: -1 } }
    ).exec();

    if (lastAccount && lastAccount.code) {
      const lastNumber = parseInt(lastAccount.code.slice(1), 10);
      return `${typePrefix}${(lastNumber + 1).toString().padStart(2, '0')}`;
    }

    return `${typePrefix}01`;
  }

  async createAccount(createAccountDto: CreateChartOfAccountDto, tenantId: string): Promise<ChartOfAccounts> {
    const code = await this.generateNextCode(createAccountDto.type, tenantId);
    
    const newAccount = new this.chartOfAccountsModel({
      ...createAccountDto,
      tenantId,
      code,
    });
    return newAccount.save();
  }

  async findAllAccounts(tenantId: string): Promise<ChartOfAccounts[]> {
    return this.chartOfAccountsModel.find({ tenantId }).sort({ code: 1 }).exec();
  }

  async findAllJournalEntries(tenantId: string, page: number, limit: number): Promise<any> {
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      this.journalEntryModel.find({ tenantId })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('lines.account', 'name code')
        .exec(),
      this.journalEntryModel.countDocuments({ tenantId }),
    ]);

    return {
      data: entries,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async fixJournalEntryDates(tenantId: string): Promise<void> {
    const stringEntries = await this.journalEntryModel.find({
      tenantId,
      date: { $type: 'string' } as any,
    });

    if (stringEntries.length > 0) {
      this.logger.log(`[DateFixer] Found ${stringEntries.length} journal entries with string dates to fix.`);
      for (const entry of stringEntries) {
        const dateStr = entry.date as any;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const year = parseInt(parts[2], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
          const day = parseInt(parts[0], 10);
          const validDate = new Date(year, month, day);

          if (!isNaN(validDate.getTime())) {
            await this.journalEntryModel.updateOne(
              { _id: entry._id },
              { $set: { date: validDate } }
            );
          }
        }
      }
    }
  }

  async createJournalEntry(createDto: CreateJournalEntryDto, tenantId: string): Promise<JournalEntryDocument> {
    const { lines, description } = createDto;

    // Validate that debits equal credits
    const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      throw new BadRequestException('Total debits must equal total credits.');
    }
    
    if (totalDebits === 0 && totalCredits === 0) {
      throw new BadRequestException('Journal entry must have non-zero debit or credit values.');
    }

    const newJournalEntry = new this.journalEntryModel({
      ...createDto,
      date: new Date(createDto.date),
      lines: createDto.lines.map(line => ({
        account: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description || description, 
      })),
      tenantId,
      isAutomatic: false,
    });

    return newJournalEntry.save();
  }

  private async findAccountByCode(code: string, tenantId: string): Promise<ChartOfAccountsDocument> {
    // TODO: In the future, consider caching these lookups.
    const account = await this.chartOfAccountsModel.findOne({ code, tenantId }).exec();
    if (!account) {
      this.logger.error(`Automatic accounting failed: Account with code "${code}" not found for tenant "${tenantId}".`);
      throw new InternalServerErrorException(`Configuración de cuenta contable automática faltante: No se encontró la cuenta con código ${code}.`);
    }
    return account;
  }

  async createJournalEntryForSale(order: OrderDocument, tenantId: string): Promise<JournalEntryDocument> {
    this.logger.log(`Creating automatic journal entry for sale ${order.orderNumber}`);

    // 1. Find all necessary accounts by their system codes
    const accountsReceivableAcc = await this.findAccountByCode("1102", tenantId);
    const salesRevenueAcc = await this.findAccountByCode("4101", tenantId);
    const taxPayableAcc = await this.findAccountByCode("2102", tenantId);

    // 2. Build the journal entry lines
    const lines: { accountId: string; debit: number; credit: number; description: string; }[] = [];

    // Debit: Accounts Receivable for the full amount
    lines.push({
      accountId: accountsReceivableAcc._id.toString(),
      debit: order.totalAmount,
      credit: 0,
      description: `Venta según orden ${order.orderNumber}`,
    });

    // Credit: Sales Revenue for the subtotal
    lines.push({
      accountId: salesRevenueAcc._id.toString(),
      debit: 0,
      credit: order.subtotal,
      description: `Ingreso por venta ${order.orderNumber}`,
    });

    // Credit: Taxes Payable for IVA and IGTF
    const totalTax = order.ivaTotal + order.igtfTotal;
    if (totalTax > 0) {
      lines.push({
        accountId: taxPayableAcc._id.toString(),
        debit: 0,
        credit: totalTax,
        description: `Impuestos (IVA/IGTF) por venta ${order.orderNumber}`,
      });
    }

    // 3. Create the DTO and save the journal entry
    const entryDto: CreateJournalEntryDto = {
      date: new Date().toISOString(),
      description: `Asiento automático por venta de orden ${order.orderNumber}`,
      lines,
    };

    const newEntry = new this.journalEntryModel({
        ...entryDto,
        date: new Date(entryDto.date),
        lines: entryDto.lines.map(line => ({
            account: line.accountId,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
        })),
        tenantId,
        isAutomatic: true,
    });

    return newEntry.save();
  }

  async createJournalEntryForPayment(order: OrderDocument, payment: OrderPayment, tenantId: string): Promise<JournalEntryDocument> {
    this.logger.log(`Creating automatic journal entry for payment on order ${order.orderNumber}`);

    // 1. Find accounts
    const cashOrBankAcc = await this.findAccountByCode("1101", tenantId);
    const accountsReceivableAcc = await this.findAccountByCode("1102", tenantId);

    // 2. Build lines
    const lines: { accountId: string; debit: number; credit: number; description: string; }[] = [
      {
        accountId: cashOrBankAcc._id.toString(),
        debit: payment.amount,
        credit: 0,
        description: `Cobro de orden ${order.orderNumber}`,
      },
      {
        accountId: accountsReceivableAcc._id.toString(),
        debit: 0,
        credit: payment.amount,
        description: `Cancelación de Cuentas por Cobrar por orden ${order.orderNumber}`,
      },
    ];

    // 3. Create DTO and save
    const entryDto: CreateJournalEntryDto = {
      date: (payment.confirmedAt || new Date()).toISOString(),
      description: `Asiento automático por cobro de orden ${order.orderNumber}`,
      lines,
    };
    
    const newEntry = new this.journalEntryModel({
        ...entryDto,
        date: new Date(entryDto.date),
        lines: entryDto.lines.map(line => ({
            account: line.accountId,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
        })),
        tenantId,
        isAutomatic: true,
    });

    return newEntry.save();
  }

  async getProfitAndLoss(tenantId: string, from: Date, to: Date): Promise<any> {
    await this.fixJournalEntryDates(tenantId);

    const allAccounts = await this.chartOfAccountsModel.find({ tenantId }).exec();
    
    const incomeAccountIds = allAccounts
      .filter(a => a.type === 'Ingreso' || a.type === 'Ingresos')
      .map(a => a._id);
      
    const expenseAccountIds = allAccounts
      .filter(a => a.type === 'Gasto' || a.type === 'Gastos')
      .map(a => a._id);

    const journalEntries = await this.journalEntryModel.find({
      tenantId,
      date: { $gte: from, $lte: to },
    }).populate('lines.account').exec();

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        if (!line.account) continue;

        const accountId = (line.account as any)._id;
        if (incomeAccountIds.some(id => id.equals(accountId))) {
          totalIncome += line.credit - line.debit;
        }
        if (expenseAccountIds.some(id => id.equals(accountId))) {
          totalExpenses += line.debit - line.credit;
        }
      }
    }

    return {
      period: {
        from,
        to,
      },
      summary: {
        totalRevenue: totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
      },
    };
  }

  async getBalanceSheet(tenantId: string, asOfDate: Date): Promise<any> {
    await this.fixJournalEntryDates(tenantId);

    const allAccounts = await this.chartOfAccountsModel.find({ tenantId }).lean();
    const journalEntries = await this.journalEntryModel.find({
      tenantId,
      date: { $lte: asOfDate },
    }).lean();

    const accountBalances = new Map<string, number>();

    // Process all journal entries to calculate final balances
    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        const accountId = line.account.toString();
        const currentBalance = accountBalances.get(accountId) || 0;
        const balanceChange = line.debit - line.credit;
        accountBalances.set(accountId, currentBalance + balanceChange);
      }
    }

    const assets: { name: string; code: string; balance: number }[] = [];
    const liabilities: { name: string; code: string; balance: number }[] = [];
    const equity: { name: string; code: string; balance: number }[] = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let netIncome = 0;

    // Categorize accounts and sum up totals
    for (const account of allAccounts) {
      const accountId = account._id.toString();
      let balance = accountBalances.get(accountId) || 0;

      if (balance === 0) continue;

      const accountInfo = {
        name: account.name,
        code: account.code,
        balance: 0, // Will be set below
      };

      switch (account.type) {
        case 'Activo':
          accountInfo.balance = balance;
          assets.push(accountInfo);
          totalAssets += balance;
          break;
        case 'Pasivo':
          accountInfo.balance = -balance; // Invert sign for correct representation
          liabilities.push(accountInfo);
          totalLiabilities += accountInfo.balance;
          break;
        case 'Patrimonio':
          accountInfo.balance = -balance; // Invert sign
          equity.push(accountInfo);
          totalEquity += accountInfo.balance;
          break;
        case 'Ingreso':
        case 'Ingresos':
          netIncome -= balance; // Invert sign
          break;
        case 'Gasto':
        case 'Gastos':
          netIncome += balance;
          break;
      }
    }
    
    // Add Net Income as a separate line item in Equity
    equity.push({
      name: "Utilidad Neta del Período",
      code: "399", // Or some other conventional code
      balance: netIncome,
    });
    totalEquity += netIncome;

    return {
      asOfDate,
      assets: {
        accounts: assets.sort((a, b) => a.code.localeCompare(b.code)),
        total: totalAssets,
      },
      liabilities: {
        accounts: liabilities.sort((a, b) => a.code.localeCompare(b.code)),
        total: totalLiabilities,
      },
      equity: {
        accounts: equity.sort((a, b) => a.code.localeCompare(b.code)),
        total: totalEquity,
      },
      // For verification: Assets = Liabilities + Equity
      verification: {
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
        difference: totalAssets - (totalLiabilities + totalEquity),
      }
    };
  }
}
