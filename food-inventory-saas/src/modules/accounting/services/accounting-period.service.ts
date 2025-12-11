import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AccountingPeriod,
  AccountingPeriodDocument,
} from '../../../schemas/accounting-period.schema';
import {
  JournalEntry,
  JournalEntryDocument,
} from '../../../schemas/journal-entry.schema';
import {
  ChartOfAccounts,
  ChartOfAccountsDocument,
} from '../../../schemas/chart-of-accounts.schema';
import {
  CreateAccountingPeriodDto,
  ClosePeriodDto,
} from '../../../dto/accounting.dto';

@Injectable()
export class AccountingPeriodService {
  private readonly logger = new Logger(AccountingPeriodService.name);

  constructor(
    @InjectModel(AccountingPeriod.name)
    private periodModel: Model<AccountingPeriodDocument>,
    @InjectModel(JournalEntry.name)
    private journalEntryModel: Model<JournalEntryDocument>,
    @InjectModel(ChartOfAccounts.name)
    private chartOfAccountsModel: Model<ChartOfAccountsDocument>,
  ) {}

  /**
   * Create a new accounting period
   */
  async create(
    dto: CreateAccountingPeriodDto,
    tenantId: string,
    userId: string,
  ): Promise<AccountingPeriodDocument> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Validate dates
    if (startDate >= endDate) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin',
      );
    }

    // Check for overlapping periods
    const overlapping = await this.periodModel.findOne({
      tenantId,
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        },
      ],
    });

    if (overlapping) {
      throw new BadRequestException(
        `Ya existe un período contable que se solapa con estas fechas: ${overlapping.name}`,
      );
    }

    // Check for duplicate name
    const existingName = await this.periodModel.findOne({
      tenantId,
      name: dto.name,
    });

    if (existingName) {
      throw new BadRequestException(
        `Ya existe un período con el nombre "${dto.name}"`,
      );
    }

    const period = new this.periodModel({
      ...dto,
      startDate,
      endDate,
      tenantId,
      createdBy: userId,
      status: 'open',
    });

    return period.save();
  }

  /**
   * Get all periods for a tenant
   */
  async findAll(
    tenantId: string,
    filters?: {
      status?: 'open' | 'closed' | 'locked';
      fiscalYear?: number;
    },
  ): Promise<AccountingPeriodDocument[]> {
    const query: any = { tenantId };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.fiscalYear) {
      query.fiscalYear = filters.fiscalYear;
    }

    return this.periodModel
      .find(query)
      .sort({ startDate: -1 })
      .populate('createdBy', 'name email')
      .populate('closedBy', 'name email')
      .populate('updatedBy', 'name email')
      .exec();
  }

  /**
   * Get a single period by ID
   */
  async findOne(id: string, tenantId: string): Promise<AccountingPeriodDocument> {
    const period = await this.periodModel
      .findOne({ _id: id, tenantId })
      .populate('createdBy', 'name email')
      .populate('closedBy', 'name email')
      .populate('closingEntryId')
      .exec();

    if (!period) {
      throw new NotFoundException('Período contable no encontrado');
    }

    return period;
  }

  /**
   * Update a period (only if not closed or locked)
   */
  async update(
    id: string,
    dto: Partial<CreateAccountingPeriodDto>,
    tenantId: string,
    userId: string,
  ): Promise<AccountingPeriodDocument> {
    const period = await this.findOne(id, tenantId);

    if (period.status !== 'open') {
      throw new BadRequestException(
        'No se puede modificar un período cerrado o bloqueado',
      );
    }

    // If changing dates, check for overlaps
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate
        ? new Date(dto.startDate)
        : period.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : period.endDate;

      const overlapping = await this.periodModel.findOne({
        tenantId,
        _id: { $ne: id },
        $or: [
          {
            startDate: { $lte: endDate },
            endDate: { $gte: startDate },
          },
        ],
      });

      if (overlapping) {
        throw new BadRequestException(
          `Las nuevas fechas se solapan con el período: ${overlapping.name}`,
        );
      }
    }

    Object.assign(period, dto);
    period.updatedBy = userId as any;

    return period.save();
  }

  /**
   * Close a period
   * - Calculates totals (revenue, expenses, net income)
   * - Creates closing journal entry
   * - Marks period as closed
   */
  async close(
    dto: ClosePeriodDto,
    tenantId: string,
    userId: string,
  ): Promise<AccountingPeriodDocument> {
    const period = await this.findOne(dto.periodId, tenantId);

    if (period.status !== 'open') {
      throw new BadRequestException('El período ya está cerrado');
    }

    this.logger.log(`Closing period ${period.name} for tenant ${tenantId}`);

    // Get all accounts
    const accounts = await this.chartOfAccountsModel
      .find({ tenantId })
      .lean();

    // Get all journal entries in the period
    const entries = await this.journalEntryModel
      .find({
        tenantId,
        date: {
          $gte: period.startDate,
          $lte: period.endDate,
        },
      })
      .lean();

    // Calculate totals
    let totalRevenue = 0;
    let totalExpenses = 0;

    const accountMap = new Map(
      accounts.map((acc) => [acc._id.toString(), acc]),
    );

    for (const entry of entries) {
      for (const line of entry.lines) {
        const accountId = line.account.toString();
        const account = accountMap.get(accountId);

        if (!account) continue;

        // Revenue accounts: credit increases revenue
        if (account.type === 'Ingreso') {
          totalRevenue += (line.credit || 0) - (line.debit || 0);
        }

        // Expense accounts: debit increases expenses
        if (account.type === 'Gasto') {
          totalExpenses += (line.debit || 0) - (line.credit || 0);
        }
      }
    }

    const netIncome = totalRevenue - totalExpenses;

    this.logger.log(
      `Period ${period.name} - Revenue: ${totalRevenue}, Expenses: ${totalExpenses}, Net Income: ${netIncome}`,
    );

    // Create closing entry (transfer revenue and expenses to equity)
    // This is a simplified version - in practice, you might want to create
    // multiple closing entries following the accounting cycle
    const closingEntry = await this.createClosingEntry(
      period,
      totalRevenue,
      totalExpenses,
      netIncome,
      tenantId,
    );

    // Update period
    period.status = 'closed';
    period.closedAt = new Date();
    period.closedBy = userId as any;
    period.closingNotes = dto.closingNotes;
    period.closingEntryId = closingEntry._id as any;
    period.totalRevenue = totalRevenue;
    period.totalExpenses = totalExpenses;
    period.netIncome = netIncome;

    return period.save();
  }

  /**
   * Lock a closed period (prevents any modifications)
   */
  async lock(id: string, tenantId: string): Promise<AccountingPeriodDocument> {
    const period = await this.findOne(id, tenantId);

    if (period.status !== 'closed') {
      throw new BadRequestException(
        'Solo se pueden bloquear períodos cerrados',
      );
    }

    period.status = 'locked';
    return period.save();
  }

  /**
   * Unlock a locked period
   */
  async unlock(id: string, tenantId: string): Promise<AccountingPeriodDocument> {
    const period = await this.findOne(id, tenantId);

    if (period.status !== 'locked') {
      throw new BadRequestException('El período no está bloqueado');
    }

    period.status = 'closed';
    return period.save();
  }

  /**
   * Reopen a closed period (if not locked)
   */
  async reopen(id: string, tenantId: string): Promise<AccountingPeriodDocument> {
    const period = await this.findOne(id, tenantId);

    if (period.status === 'locked') {
      throw new BadRequestException(
        'No se puede reabrir un período bloqueado. Primero debe desbloquearlo.',
      );
    }

    if (period.status === 'open') {
      throw new BadRequestException('El período ya está abierto');
    }

    // Delete closing entry if exists
    if (period.closingEntryId) {
      await this.journalEntryModel.findByIdAndDelete(period.closingEntryId);
    }

    // Reset closing data
    period.status = 'open';
    period.closedAt = undefined;
    period.closedBy = undefined;
    period.closingNotes = undefined;
    period.closingEntryId = undefined;
    period.totalRevenue = undefined;
    period.totalExpenses = undefined;
    period.netIncome = undefined;

    return period.save();
  }

  /**
   * Delete a period (only if open and has no transactions)
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const period = await this.findOne(id, tenantId);

    if (period.status !== 'open') {
      throw new BadRequestException(
        'Solo se pueden eliminar períodos abiertos',
      );
    }

    // Check if period has any transactions
    const transactionCount = await this.journalEntryModel.countDocuments({
      tenantId,
      date: {
        $gte: period.startDate,
        $lte: period.endDate,
      },
    });

    if (transactionCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar el período porque tiene ${transactionCount} transacciones`,
      );
    }

    await this.periodModel.findByIdAndDelete(id);
  }

  /**
   * Check if a date falls within an open period
   */
  async validateDateInOpenPeriod(
    date: Date,
    tenantId: string,
  ): Promise<boolean> {
    const period = await this.periodModel.findOne({
      tenantId,
      status: 'open',
      startDate: { $lte: date },
      endDate: { $gte: date },
    });

    return !!period;
  }

  /**
   * Get period for a specific date
   */
  async getPeriodForDate(
    date: Date,
    tenantId: string,
  ): Promise<AccountingPeriodDocument | null> {
    return this.periodModel
      .findOne({
        tenantId,
        startDate: { $lte: date },
        endDate: { $gte: date },
      })
      .exec();
  }

  /**
   * Create closing journal entry
   * Transfers revenue and expense balances to equity (retained earnings)
   */
  private async createClosingEntry(
    period: AccountingPeriodDocument,
    totalRevenue: number,
    totalExpenses: number,
    netIncome: number,
    tenantId: string,
  ): Promise<JournalEntryDocument> {
    // Find or create retained earnings account (Utilidades Retenidas - Equity)
    let retainedEarningsAccount = await this.chartOfAccountsModel.findOne({
      tenantId,
      code: '3102', // Standard code for retained earnings
    });

    if (!retainedEarningsAccount) {
      // Create it if it doesn't exist
      retainedEarningsAccount = new this.chartOfAccountsModel({
        tenantId,
        code: '3102',
        name: 'Utilidades Retenidas',
        type: 'Patrimonio',
        isSystemAccount: true,
        isEditable: false,
      });
      await retainedEarningsAccount.save();
    }

    // Find income summary account (or create it)
    let incomeSummaryAccount = await this.chartOfAccountsModel.findOne({
      tenantId,
      code: '3999', // Temporary account for closing
    });

    if (!incomeSummaryAccount) {
      incomeSummaryAccount = new this.chartOfAccountsModel({
        tenantId,
        code: '3999',
        name: 'Resumen de Ingresos y Gastos',
        type: 'Patrimonio',
        isSystemAccount: true,
        isEditable: false,
      });
      await incomeSummaryAccount.save();
    }

    // Create closing entry
    // If net income is positive (profit):
    //   Debit: Income Summary
    //   Credit: Retained Earnings
    // If net income is negative (loss):
    //   Debit: Retained Earnings
    //   Credit: Income Summary

    const lines: Array<{
      account: any;
      debit: number;
      credit: number;
      description: string;
    }> = [];

    if (netIncome > 0) {
      // Profit
      lines.push({
        account: incomeSummaryAccount._id,
        debit: netIncome,
        credit: 0,
        description: `Transferencia de utilidad neta del período ${period.name}`,
      });
      lines.push({
        account: retainedEarningsAccount._id,
        debit: 0,
        credit: netIncome,
        description: `Utilidad neta del período ${period.name}`,
      });
    } else if (netIncome < 0) {
      // Loss
      const loss = Math.abs(netIncome);
      lines.push({
        account: retainedEarningsAccount._id,
        debit: loss,
        credit: 0,
        description: `Pérdida neta del período ${period.name}`,
      });
      lines.push({
        account: incomeSummaryAccount._id,
        debit: 0,
        credit: loss,
        description: `Transferencia de pérdida neta del período ${period.name}`,
      });
    } else {
      // Break-even (no entry needed, but create a zero entry for record keeping)
      lines.push({
        account: incomeSummaryAccount._id,
        debit: 0.01, // Nominal amount
        credit: 0,
        description: `Cierre del período ${period.name} (punto de equilibrio)`,
      });
      lines.push({
        account: retainedEarningsAccount._id,
        debit: 0,
        credit: 0.01,
        description: `Cierre del período ${period.name} (punto de equilibrio)`,
      });
    }

    const closingEntry = new this.journalEntryModel({
      date: period.endDate,
      description: `Asiento de cierre - ${period.name}`,
      lines,
      tenantId,
      isAutomatic: true,
      metadata: {
        periodId: period._id,
        periodName: period.name,
        closingEntry: true,
        totalRevenue,
        totalExpenses,
        netIncome,
      },
    });

    return closingEntry.save();
  }

  /**
   * Get fiscal years available
   */
  async getFiscalYears(tenantId: string): Promise<number[]> {
    const periods = await this.periodModel
      .find({ tenantId })
      .distinct('fiscalYear')
      .exec();

    return periods.sort((a, b) => b - a);
  }

  /**
   * Get current open period (if any)
   */
  async getCurrentPeriod(tenantId: string): Promise<AccountingPeriodDocument | null> {
    const today = new Date();

    return this.periodModel
      .findOne({
        tenantId,
        status: 'open',
        startDate: { $lte: today },
        endDate: { $gte: today },
      })
      .exec();
  }
}
