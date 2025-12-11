import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RecurringEntry,
  RecurringEntryDocument,
} from '../../../schemas/recurring-entry.schema';
import {
  JournalEntry,
  JournalEntryDocument,
} from '../../../schemas/journal-entry.schema';
import { AccountingService } from '../accounting.service';
import {
  CreateRecurringEntryDto,
  UpdateRecurringEntryDto,
  ExecuteRecurringEntriesDto,
} from '../../../dto/accounting.dto';
import {
  addMonths,
  addWeeks,
  addYears,
  startOfMonth,
  endOfMonth,
  isAfter,
  isBefore,
  setDate,
  setDay,
  format,
} from 'date-fns';

@Injectable()
export class RecurringEntryService {
  private readonly logger = new Logger(RecurringEntryService.name);

  constructor(
    @InjectModel(RecurringEntry.name)
    private recurringEntryModel: Model<RecurringEntryDocument>,
    @InjectModel(JournalEntry.name)
    private journalEntryModel: Model<JournalEntryDocument>,
    private accountingService: AccountingService,
  ) {}

  /**
   * Create a new recurring entry template
   */
  async create(
    dto: CreateRecurringEntryDto,
    tenantId: string,
    userId: string,
  ): Promise<RecurringEntryDocument> {
    // Validate lines (debits must equal credits)
    const totalDebits = dto.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = dto.lines.reduce((sum, line) => sum + line.credit, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new BadRequestException(
        'El total de débitos debe ser igual al total de créditos',
      );
    }

    // Check for duplicate name
    const existing = await this.recurringEntryModel.findOne({
      tenantId,
      name: dto.name,
    });

    if (existing) {
      throw new BadRequestException(
        `Ya existe un asiento recurrente con el nombre "${dto.name}"`,
      );
    }

    // Calculate next execution date
    const startDate = new Date(dto.startDate);
    const nextExecutionDate = this.calculateNextExecutionDate(
      startDate,
      dto.frequency,
      dto.dayOfMonth,
      dto.dayOfWeek,
    );

    const recurringEntry = new this.recurringEntryModel({
      ...dto,
      startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      tenantId,
      createdBy: userId,
      nextExecutionDate,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      executionCount: 0,
      generatedEntries: [],
    });

    return recurringEntry.save();
  }

  /**
   * Get all recurring entries for a tenant
   */
  async findAll(
    tenantId: string,
    filters?: {
      isActive?: boolean;
      frequency?: string;
    },
  ): Promise<RecurringEntryDocument[]> {
    const query: any = { tenantId };

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.frequency) {
      query.frequency = filters.frequency;
    }

    return this.recurringEntryModel
      .find(query)
      .sort({ name: 1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('lines.account', 'name code')
      .exec();
  }

  /**
   * Get a single recurring entry by ID
   */
  async findOne(id: string, tenantId: string): Promise<RecurringEntryDocument> {
    const entry = await this.recurringEntryModel
      .findOne({ _id: id, tenantId })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('lines.account', 'name code')
      .populate('generatedEntries')
      .exec();

    if (!entry) {
      throw new NotFoundException('Asiento recurrente no encontrado');
    }

    return entry;
  }

  /**
   * Update a recurring entry
   */
  async update(
    id: string,
    dto: UpdateRecurringEntryDto,
    tenantId: string,
    userId: string,
  ): Promise<RecurringEntryDocument> {
    const entry = await this.findOne(id, tenantId);

    // Validate lines if provided
    if (dto.lines) {
      const totalDebits = dto.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = dto.lines.reduce(
        (sum, line) => sum + line.credit,
        0,
      );

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new BadRequestException(
          'El total de débitos debe ser igual al total de créditos',
        );
      }
    }

    // Check for duplicate name if changing name
    if (dto.name && dto.name !== entry.name) {
      const existing = await this.recurringEntryModel.findOne({
        tenantId,
        name: dto.name,
        _id: { $ne: id },
      });

      if (existing) {
        throw new BadRequestException(
          `Ya existe un asiento recurrente con el nombre "${dto.name}"`,
        );
      }
    }

    // Update fields
    Object.assign(entry, dto);
    entry.updatedBy = userId as any;

    // Recalculate next execution date if relevant fields changed
    if (
      dto.frequency ||
      dto.startDate ||
      dto.dayOfMonth !== undefined ||
      dto.dayOfWeek !== undefined
    ) {
      const baseDate = entry.lastExecutionDate || entry.startDate;
      entry.nextExecutionDate = this.calculateNextExecutionDate(
        baseDate,
        entry.frequency,
        entry.dayOfMonth,
        entry.dayOfWeek,
      );
    }

    return entry.save();
  }

  /**
   * Delete a recurring entry
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const entry = await this.findOne(id, tenantId);

    // We allow deletion even if it has generated entries (for audit purposes)
    // But we could add a flag to prevent deletion if needed

    await this.recurringEntryModel.findByIdAndDelete(id);
  }

  /**
   * Activate/Deactivate a recurring entry
   */
  async toggleActive(id: string, tenantId: string): Promise<RecurringEntryDocument> {
    const entry = await this.findOne(id, tenantId);
    entry.isActive = !entry.isActive;
    return entry.save();
  }

  /**
   * Execute a specific recurring entry manually
   */
  async executeOne(
    id: string,
    executionDate: Date,
    tenantId: string,
  ): Promise<JournalEntry> {
    const recurringEntry = await this.findOne(id, tenantId);

    if (!recurringEntry.isActive) {
      throw new BadRequestException(
        'No se puede ejecutar un asiento recurrente inactivo',
      );
    }

    // Check if execution date is within the valid range
    if (isBefore(executionDate, recurringEntry.startDate)) {
      throw new BadRequestException(
        'La fecha de ejecución debe ser posterior a la fecha de inicio',
      );
    }

    if (
      recurringEntry.endDate &&
      isAfter(executionDate, recurringEntry.endDate)
    ) {
      throw new BadRequestException(
        'La fecha de ejecución debe ser anterior a la fecha de fin',
      );
    }

    // Create journal entry
    const journalEntry = await this.createJournalEntryFromTemplate(
      recurringEntry,
      executionDate,
      tenantId,
    );

    // Update recurring entry
    recurringEntry.lastExecutionDate = executionDate;
    recurringEntry.executionCount += 1;
    recurringEntry.nextExecutionDate = this.calculateNextExecutionDate(
      executionDate,
      recurringEntry.frequency,
      recurringEntry.dayOfMonth,
      recurringEntry.dayOfWeek,
    );
    recurringEntry.generatedEntries.push(journalEntry._id as any);

    await recurringEntry.save();

    this.logger.log(
      `Executed recurring entry "${recurringEntry.name}" for date ${format(executionDate, 'yyyy-MM-dd')}`,
    );

    return journalEntry;
  }

  /**
   * Execute all pending recurring entries
   * This method should be called by a scheduled job (cron)
   */
  async executeAllPending(
    dto: ExecuteRecurringEntriesDto,
    tenantId: string,
  ): Promise<{ executed: number; entries: JournalEntry[] }> {
    const executionDate = new Date(dto.executionDate);

    let query: any = {
      tenantId,
      isActive: true,
      nextExecutionDate: { $lte: executionDate },
    };

    // If specific recurring entry ID is provided, execute only that one
    if (dto.recurringEntryId) {
      query._id = dto.recurringEntryId;
    }

    const pendingEntries = await this.recurringEntryModel.find(query);

    this.logger.log(
      `Found ${pendingEntries.length} pending recurring entries to execute for date ${format(executionDate, 'yyyy-MM-dd')}`,
    );

    const executedEntries: JournalEntry[] = [];

    for (const recurringEntry of pendingEntries) {
      try {
        // Check if already executed for this date (avoid duplicates)
        const alreadyExecuted = await this.journalEntryModel.findOne({
          tenantId,
          date: executionDate,
          'metadata.recurringEntryId': recurringEntry._id,
        });

        if (alreadyExecuted) {
          this.logger.log(
            `Skipping "${recurringEntry.name}" - already executed for ${format(executionDate, 'yyyy-MM-dd')}`,
          );
          continue;
        }

        // Check if execution date is still valid
        if (
          recurringEntry.endDate &&
          isAfter(executionDate, recurringEntry.endDate)
        ) {
          this.logger.log(
            `Deactivating "${recurringEntry.name}" - past end date`,
          );
          recurringEntry.isActive = false;
          await recurringEntry.save();
          continue;
        }

        const journalEntry = await this.executeOne(
          recurringEntry._id.toString(),
          executionDate,
          tenantId,
        );

        executedEntries.push(journalEntry);
      } catch (error) {
        this.logger.error(
          `Error executing recurring entry "${recurringEntry.name}": ${error.message}`,
        );
        // Continue with other entries even if one fails
      }
    }

    return {
      executed: executedEntries.length,
      entries: executedEntries,
    };
  }

  /**
   * Get upcoming executions for all active recurring entries
   */
  async getUpcomingExecutions(
    tenantId: string,
    daysAhead = 30,
  ): Promise<
    Array<{
      recurringEntry: RecurringEntryDocument;
      nextExecutionDate: Date;
    }>
  > {
    const maxDate = addMonths(new Date(), Math.ceil(daysAhead / 30));

    const activeEntries = await this.recurringEntryModel
      .find({
        tenantId,
        isActive: true,
        nextExecutionDate: { $lte: maxDate },
      })
      .sort({ nextExecutionDate: 1 })
      .populate('lines.account', 'name code')
      .exec();

    return activeEntries.map((entry) => ({
      recurringEntry: entry,
      nextExecutionDate: entry.nextExecutionDate!,
    }));
  }

  /**
   * Calculate next execution date based on frequency
   */
  private calculateNextExecutionDate(
    baseDate: Date,
    frequency: string,
    dayOfMonth?: number,
    dayOfWeek?: number,
  ): Date {
    let nextDate: Date;

    switch (frequency) {
      case 'monthly':
        nextDate = addMonths(baseDate, 1);
        if (dayOfMonth) {
          // Set to specific day of month (e.g., 1st, 15th, last day)
          nextDate = setDate(nextDate, Math.min(dayOfMonth, 28)); // Avoid issues with month length
        } else {
          // Keep the same day of month
          nextDate = setDate(nextDate, baseDate.getDate());
        }
        break;

      case 'quarterly':
        nextDate = addMonths(baseDate, 3);
        if (dayOfMonth) {
          nextDate = setDate(nextDate, Math.min(dayOfMonth, 28));
        }
        break;

      case 'yearly':
        nextDate = addYears(baseDate, 1);
        if (dayOfMonth) {
          nextDate = setDate(nextDate, Math.min(dayOfMonth, 28));
        }
        break;

      case 'weekly':
        nextDate = addWeeks(baseDate, 1);
        if (dayOfWeek !== undefined) {
          // Set to specific day of week (0 = Sunday, 6 = Saturday)
          nextDate = setDay(nextDate, dayOfWeek);
        }
        break;

      default:
        throw new BadRequestException(`Frecuencia inválida: ${frequency}`);
    }

    return nextDate;
  }

  /**
   * Create a journal entry from a recurring entry template
   */
  private async createJournalEntryFromTemplate(
    recurringEntry: RecurringEntryDocument,
    executionDate: Date,
    tenantId: string,
  ): Promise<JournalEntryDocument> {
    // Transform recurring entry lines to journal entry lines format
    const lines = recurringEntry.lines.map((line) => ({
      accountId: line.account.toString(),
      debit: line.debit,
      credit: line.credit,
      description: line.description,
    }));

    // Create journal entry using the accounting service
    const journalEntry = await this.accountingService.createJournalEntry(
      {
        date: executionDate.toISOString(),
        description: `${recurringEntry.description} (Asiento Recurrente)`,
        lines,
        isAutomatic: true,
      } as any,
      tenantId,
    );

    // Add metadata to track the recurring entry
    journalEntry.metadata = {
      recurringEntryId: recurringEntry._id,
      recurringEntryName: recurringEntry.name,
      executionCount: recurringEntry.executionCount + 1,
      frequency: recurringEntry.frequency,
    };

    await journalEntry.save();

    return journalEntry;
  }
}
