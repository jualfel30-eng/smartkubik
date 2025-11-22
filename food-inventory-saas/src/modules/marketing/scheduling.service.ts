import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  CampaignSchedule,
  CampaignScheduleDocument,
  ScheduleType,
  ScheduleStatus,
  RecurrenceFrequency,
} from "../../schemas/campaign-schedule.schema";
import {
  MarketingCampaign,
  MarketingCampaignDocument,
} from "../../schemas/marketing-campaign.schema";
import {
  CreateScheduleDto,
  UpdateScheduleDto,
} from "../../dto/campaign-schedule.dto";

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    @InjectModel(CampaignSchedule.name)
    private scheduleModel: Model<CampaignScheduleDocument>,
    @InjectModel(MarketingCampaign.name)
    private campaignModel: Model<MarketingCampaignDocument>,
  ) {}

  /**
   * Create a new campaign schedule
   */
  async createSchedule(
    dto: CreateScheduleDto,
    tenantId: string,
  ): Promise<CampaignSchedule> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const campaignObjectId = new Types.ObjectId(dto.campaignId);

    // Validate campaign exists
    const campaign = await this.campaignModel.findOne({
      _id: campaignObjectId,
      tenantId: tenantObjectId,
    });

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    // Validate schedule configuration
    this.validateScheduleConfig(dto);

    // Calculate next execution time
    const nextExecutionAt = this.calculateNextExecution(dto);

    const schedule = await this.scheduleModel.create({
      tenantId: tenantObjectId,
      campaignId: campaignObjectId,
      name: dto.name,
      type: dto.type,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      recurrenceFrequency: dto.recurrenceFrequency,
      recurrenceInterval: dto.recurrenceInterval,
      recurrenceDaysOfWeek: dto.recurrenceDaysOfWeek,
      recurrenceDayOfMonth: dto.recurrenceDayOfMonth,
      recurrenceEndDate: dto.recurrenceEndDate
        ? new Date(dto.recurrenceEndDate)
        : undefined,
      cronExpression: dto.cronExpression,
      timezone: dto.timezone || "UTC",
      status:
        dto.type === ScheduleType.IMMEDIATE
          ? ScheduleStatus.ACTIVE
          : ScheduleStatus.PENDING,
      nextExecutionAt,
      maxExecutions: dto.maxExecutions,
      enabled: dto.enabled !== false,
      filters: dto.filters,
      executionHistory: [],
    });

    this.logger.log(
      `Created schedule ${schedule._id} for campaign ${dto.campaignId}`,
    );

    // If immediate, execute now
    if (dto.type === ScheduleType.IMMEDIATE && schedule.enabled) {
      await this.executeSchedule(schedule._id.toString(), tenantId);
    }

    return schedule;
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(
    scheduleId: string,
    dto: UpdateScheduleDto,
    tenantId: string,
  ): Promise<CampaignSchedule> {
    const schedule = await this.scheduleModel.findOne({
      _id: new Types.ObjectId(scheduleId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!schedule) {
      throw new NotFoundException("Schedule not found");
    }

    // Update fields
    if (dto.name) schedule.name = dto.name;
    if (dto.status) schedule.status = dto.status;
    if (dto.scheduledAt) schedule.scheduledAt = new Date(dto.scheduledAt);
    if (dto.recurrenceFrequency)
      schedule.recurrenceFrequency = dto.recurrenceFrequency;
    if (dto.recurrenceInterval !== undefined)
      schedule.recurrenceInterval = dto.recurrenceInterval;
    if (dto.recurrenceDaysOfWeek)
      schedule.recurrenceDaysOfWeek = dto.recurrenceDaysOfWeek;
    if (dto.recurrenceDayOfMonth !== undefined)
      schedule.recurrenceDayOfMonth = dto.recurrenceDayOfMonth;
    if (dto.recurrenceEndDate)
      schedule.recurrenceEndDate = new Date(dto.recurrenceEndDate);
    if (dto.cronExpression) schedule.cronExpression = dto.cronExpression;
    if (dto.timezone) schedule.timezone = dto.timezone;
    if (dto.maxExecutions !== undefined)
      schedule.maxExecutions = dto.maxExecutions;
    if (dto.enabled !== undefined) schedule.enabled = dto.enabled;
    if (dto.filters) schedule.filters = dto.filters;

    // Recalculate next execution
    schedule.nextExecutionAt =
      this.calculateNextExecutionFromSchedule(schedule);

    await schedule.save();

    this.logger.log(`Updated schedule ${scheduleId}`);

    return schedule;
  }

  /**
   * Get a schedule by ID
   */
  async getSchedule(
    scheduleId: string,
    tenantId: string,
  ): Promise<CampaignSchedule> {
    const schedule = await this.scheduleModel
      .findOne({
        _id: new Types.ObjectId(scheduleId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .populate("campaignId")
      .lean();

    if (!schedule) {
      throw new NotFoundException("Schedule not found");
    }

    return schedule;
  }

  /**
   * Get all schedules for a tenant
   */
  async getSchedules(
    tenantId: string,
    filters?: any,
  ): Promise<CampaignSchedule[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters?.campaignId) {
      query.campaignId = new Types.ObjectId(filters.campaignId);
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.type) {
      query.type = filters.type;
    }
    if (filters?.enabled !== undefined) {
      query.enabled = filters.enabled;
    }

    const schedules = await this.scheduleModel
      .find(query)
      .populate("campaignId")
      .sort({ createdAt: -1 })
      .lean();

    return schedules;
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string, tenantId: string): Promise<void> {
    const result = await this.scheduleModel.deleteOne({
      _id: new Types.ObjectId(scheduleId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException("Schedule not found");
    }

    this.logger.log(`Deleted schedule ${scheduleId}`);
  }

  /**
   * Pause a schedule
   */
  async pauseSchedule(
    scheduleId: string,
    tenantId: string,
  ): Promise<CampaignSchedule> {
    const schedule = await this.scheduleModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(scheduleId),
        tenantId: new Types.ObjectId(tenantId),
      },
      { $set: { status: ScheduleStatus.PAUSED } },
      { new: true },
    );

    if (!schedule) {
      throw new NotFoundException("Schedule not found");
    }

    this.logger.log(`Paused schedule ${scheduleId}`);
    return schedule;
  }

  /**
   * Resume a paused schedule
   */
  async resumeSchedule(
    scheduleId: string,
    tenantId: string,
  ): Promise<CampaignSchedule> {
    const schedule = await this.scheduleModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(scheduleId),
        tenantId: new Types.ObjectId(tenantId),
      },
      { $set: { status: ScheduleStatus.ACTIVE } },
      { new: true },
    );

    if (!schedule) {
      throw new NotFoundException("Schedule not found");
    }

    this.logger.log(`Resumed schedule ${scheduleId}`);
    return schedule;
  }

  /**
   * Cron job to check and execute pending schedules (runs every minute)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkPendingSchedules() {
    this.logger.debug("Checking for pending scheduled campaigns...");

    try {
      const now = new Date();

      // Find schedules that are due for execution
      const dueSchedules = await this.scheduleModel.find({
        status: { $in: [ScheduleStatus.PENDING, ScheduleStatus.ACTIVE] },
        enabled: true,
        nextExecutionAt: { $lte: now },
      });

      this.logger.log(
        `Found ${dueSchedules.length} schedules due for execution`,
      );

      for (const schedule of dueSchedules) {
        try {
          await this.executeSchedule(
            schedule._id.toString(),
            schedule.tenantId.toString(),
          );
        } catch (error: any) {
          this.logger.error(
            `Error executing schedule ${schedule._id}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Error in checkPendingSchedules: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Execute a schedule (send the campaign)
   */
  private async executeSchedule(
    scheduleId: string,
    tenantId: string,
  ): Promise<void> {
    const schedule = await this.scheduleModel.findOne({
      _id: new Types.ObjectId(scheduleId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!schedule) {
      throw new NotFoundException("Schedule not found");
    }

    this.logger.log(`Executing schedule ${scheduleId}...`);

    try {
      // Get the campaign
      const campaign = await this.campaignModel.findById(schedule.campaignId);

      if (!campaign) {
        throw new NotFoundException("Campaign not found");
      }

      // TODO: Integrate with actual campaign sending logic
      // For now, we'll just log and update the schedule
      this.logger.log(`Would send campaign ${campaign._id} to recipients`);

      // Update execution tracking
      schedule.executionCount += 1;
      schedule.lastExecutedAt = new Date();

      schedule.executionHistory.push({
        executedAt: new Date(),
        success: true,
      });

      // Calculate next execution for recurring schedules
      if (schedule.type === ScheduleType.RECURRING) {
        schedule.nextExecutionAt =
          this.calculateNextExecutionFromSchedule(schedule);

        // Check if max executions reached
        if (
          schedule.maxExecutions &&
          schedule.executionCount >= schedule.maxExecutions
        ) {
          schedule.status = ScheduleStatus.COMPLETED;
          this.logger.log(
            `Schedule ${scheduleId} completed (max executions reached)`,
          );
        }

        // Check if recurrence end date passed
        if (
          schedule.recurrenceEndDate &&
          new Date() > schedule.recurrenceEndDate
        ) {
          schedule.status = ScheduleStatus.COMPLETED;
          this.logger.log(
            `Schedule ${scheduleId} completed (end date reached)`,
          );
        }
      } else {
        // One-time schedule
        schedule.status = ScheduleStatus.COMPLETED;
      }

      await schedule.save();

      this.logger.log(`Schedule ${scheduleId} executed successfully`);
    } catch (error: any) {
      this.logger.error(
        `Error executing schedule ${scheduleId}: ${error.message}`,
        error.stack,
      );

      schedule.executionHistory.push({
        executedAt: new Date(),
        success: false,
        error: error.message,
      });

      await schedule.save();

      throw error;
    }
  }

  /**
   * Validate schedule configuration
   */
  private validateScheduleConfig(dto: CreateScheduleDto): void {
    if (dto.type === ScheduleType.SCHEDULED && !dto.scheduledAt) {
      throw new BadRequestException(
        "scheduledAt is required for scheduled campaigns",
      );
    }

    if (dto.type === ScheduleType.RECURRING) {
      if (
        dto.recurrenceFrequency === RecurrenceFrequency.CUSTOM &&
        !dto.cronExpression
      ) {
        throw new BadRequestException(
          "cronExpression is required for custom recurrence",
        );
      }

      if (
        dto.recurrenceFrequency !== RecurrenceFrequency.CUSTOM &&
        !dto.recurrenceInterval
      ) {
        throw new BadRequestException(
          "recurrenceInterval is required for non-custom recurrence",
        );
      }

      if (
        dto.recurrenceFrequency === RecurrenceFrequency.WEEKLY &&
        !dto.recurrenceDaysOfWeek
      ) {
        throw new BadRequestException(
          "recurrenceDaysOfWeek is required for weekly recurrence",
        );
      }

      if (
        dto.recurrenceFrequency === RecurrenceFrequency.MONTHLY &&
        !dto.recurrenceDayOfMonth
      ) {
        throw new BadRequestException(
          "recurrenceDayOfMonth is required for monthly recurrence",
        );
      }
    }
  }

  /**
   * Calculate next execution time from DTO
   */
  private calculateNextExecution(dto: CreateScheduleDto): Date | undefined {
    if (dto.type === ScheduleType.IMMEDIATE) {
      return new Date();
    }

    if (dto.type === ScheduleType.SCHEDULED) {
      return dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;
    }

    if (dto.type === ScheduleType.RECURRING) {
      return this.calculateRecurringNextExecution(
        dto.recurrenceFrequency!,
        dto.recurrenceInterval || 1,
        dto.recurrenceDaysOfWeek,
        dto.recurrenceDayOfMonth,
      );
    }

    return undefined;
  }

  /**
   * Calculate next execution time from schedule document
   */
  private calculateNextExecutionFromSchedule(
    schedule: CampaignSchedule,
  ): Date | undefined {
    if (
      schedule.type === ScheduleType.RECURRING &&
      schedule.recurrenceFrequency
    ) {
      return this.calculateRecurringNextExecution(
        schedule.recurrenceFrequency,
        schedule.recurrenceInterval || 1,
        schedule.recurrenceDaysOfWeek,
        schedule.recurrenceDayOfMonth,
      );
    }

    return undefined;
  }

  /**
   * Calculate next execution for recurring schedules
   */
  private calculateRecurringNextExecution(
    frequency: RecurrenceFrequency,
    interval: number,
    daysOfWeek?: number[],
    dayOfMonth?: number,
  ): Date {
    const now = new Date();
    const nextDate = new Date(now);

    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + interval);
        break;

      case RecurrenceFrequency.WEEKLY:
        if (daysOfWeek && daysOfWeek.length > 0) {
          // Find next day of week
          const currentDay = nextDate.getDay();
          const sortedDays = daysOfWeek.sort((a, b) => a - b);

          let daysToAdd = 0;
          let found = false;

          for (const day of sortedDays) {
            if (day > currentDay) {
              daysToAdd = day - currentDay;
              found = true;
              break;
            }
          }

          if (!found) {
            // Next occurrence is next week
            daysToAdd = 7 - currentDay + sortedDays[0];
          }

          nextDate.setDate(nextDate.getDate() + daysToAdd);
        } else {
          nextDate.setDate(nextDate.getDate() + 7 * interval);
        }
        break;

      case RecurrenceFrequency.MONTHLY:
        if (dayOfMonth) {
          nextDate.setMonth(nextDate.getMonth() + interval);
          nextDate.setDate(dayOfMonth);
        } else {
          nextDate.setMonth(nextDate.getMonth() + interval);
        }
        break;

      case RecurrenceFrequency.CUSTOM:
        // For custom, we'd use a cron library to calculate next execution
        // For now, default to 1 day
        nextDate.setDate(nextDate.getDate() + 1);
        break;
    }

    return nextDate;
  }
}
