import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  MarketingTrigger,
  MarketingTriggerDocument,
  TriggerEventType,
  TriggerStatus,
} from "../../schemas/marketing-trigger.schema";
import {
  TriggerExecutionLog,
  TriggerExecutionLogDocument,
  ExecutionStatus,
} from "../../schemas/trigger-execution-log.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { Order, OrderDocument } from "../../schemas/order.schema";
import {
  CreateMarketingTriggerDto,
  UpdateMarketingTriggerDto,
  TriggerFilterDto,
} from "../../dto/marketing-trigger.dto";

/**
 * MarketingTriggerService - Phase 3: Behavioral Triggers
 *
 * Handles automated marketing triggers based on customer behavior
 */
@Injectable()
export class MarketingTriggerService {
  private readonly logger = new Logger(MarketingTriggerService.name);

  constructor(
    @InjectModel(MarketingTrigger.name)
    private triggerModel: Model<MarketingTriggerDocument>,
    @InjectModel(TriggerExecutionLog.name)
    private executionLogModel: Model<TriggerExecutionLogDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
  ) {}

  /**
   * Create a new marketing trigger
   */
  async createTrigger(
    dto: CreateMarketingTriggerDto,
    tenantId: string,
  ): Promise<MarketingTrigger> {
    const trigger = await this.triggerModel.create({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
      campaignId: new Types.ObjectId(dto.campaignId),
    });

    this.logger.log(`Created trigger ${trigger._id} for tenant ${tenantId}`);
    return trigger.toObject();
  }

  /**
   * Get all triggers for a tenant
   */
  async getTriggers(
    tenantId: string,
    filters: TriggerFilterDto = {},
  ): Promise<MarketingTrigger[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters.eventType) query.eventType = filters.eventType;
    if (filters.status) query.status = filters.status;
    if (filters.campaignId)
      query.campaignId = new Types.ObjectId(filters.campaignId);

    const triggers = await this.triggerModel
      .find(query)
      .populate("campaignId", "name channel status")
      .sort({ createdAt: -1 })
      .lean();

    return triggers;
  }

  /**
   * Get a single trigger
   */
  async getTrigger(id: string, tenantId: string): Promise<MarketingTrigger> {
    const trigger = await this.triggerModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      })
      .populate("campaignId")
      .lean();

    if (!trigger) {
      throw new NotFoundException("Trigger not found");
    }

    return trigger;
  }

  /**
   * Update a trigger
   */
  async updateTrigger(
    id: string,
    dto: UpdateMarketingTriggerDto,
    tenantId: string,
  ): Promise<MarketingTrigger> {
    const updateData: any = { ...dto };

    if (dto.campaignId) {
      updateData.campaignId = new Types.ObjectId(dto.campaignId);
    }

    const trigger = await this.triggerModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          tenantId: new Types.ObjectId(tenantId),
        },
        { $set: updateData },
        { new: true },
      )
      .lean();

    if (!trigger) {
      throw new NotFoundException("Trigger not found");
    }

    this.logger.log(`Updated trigger ${id} for tenant ${tenantId}`);
    return trigger;
  }

  /**
   * Delete a trigger
   */
  async deleteTrigger(id: string, tenantId: string): Promise<void> {
    const result = await this.triggerModel.deleteOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException("Trigger not found");
    }

    this.logger.log(`Deleted trigger ${id} for tenant ${tenantId}`);
  }

  /**
   * Activate/Pause a trigger
   */
  async toggleTriggerStatus(
    id: string,
    tenantId: string,
    status: TriggerStatus,
  ): Promise<MarketingTrigger> {
    const trigger = await this.triggerModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          tenantId: new Types.ObjectId(tenantId),
        },
        { $set: { status } },
        { new: true },
      )
      .lean();

    if (!trigger) {
      throw new NotFoundException("Trigger not found");
    }

    this.logger.log(`Set trigger ${id} status to ${status}`);
    return trigger;
  }

  /**
   * Process a behavioral event and trigger campaigns
   */
  async processEvent(
    eventType: TriggerEventType,
    customerId: string,
    tenantId: string,
    eventData?: any,
  ): Promise<void> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const customerObjectId = new Types.ObjectId(customerId);

    // Find active triggers for this event type
    const triggers = await this.triggerModel.find({
      tenantId: tenantObjectId,
      eventType,
      status: TriggerStatus.ACTIVE,
    });

    if (triggers.length === 0) {
      return;
    }

    // Get customer details
    const customer = await this.customerModel
      .findOne({
        _id: customerObjectId,
        tenantId: tenantObjectId,
      })
      .lean();

    if (!customer) {
      this.logger.warn(`Customer ${customerId} not found`);
      return;
    }

    // Process each matching trigger
    for (const trigger of triggers) {
      try {
        // Check if customer matches trigger conditions
        const matches = await this.checkTriggerConditions(
          trigger,
          customer,
          eventData,
        );

        if (!matches) {
          this.logger.debug(
            `Customer ${customerId} doesn't match trigger ${trigger._id} conditions`,
          );
          continue;
        }

        // Check cooldown and max executions
        const canExecute = await this.checkExecutionLimits(
          trigger,
          customerObjectId,
          tenantObjectId,
        );

        if (!canExecute) {
          this.logger.debug(
            `Trigger ${trigger._id} execution limits reached for customer ${customerId}`,
          );
          continue;
        }

        // Create execution log
        await this.executeTrigger(
          trigger,
          customerObjectId,
          tenantObjectId,
          eventData,
        );
      } catch (error) {
        this.logger.error(
          `Error processing trigger ${trigger._id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Check if customer matches trigger conditions
   */
  private async checkTriggerConditions(
    trigger: MarketingTriggerDocument,
    customer: any,
    eventData: any,
  ): Promise<boolean> {
    const { conditions } = trigger;

    if (!conditions) {
      return true; // No conditions = match all
    }

    // Check customer segment filters
    if (conditions.customerSegment) {
      const { tiers, minSpent, maxSpent } = conditions.customerSegment;

      if (tiers && tiers.length > 0) {
        if (!customer.tier || !tiers.includes(customer.tier)) {
          return false;
        }
      }

      if (minSpent !== undefined && customer.totalSpent < minSpent) {
        return false;
      }

      if (maxSpent !== undefined && customer.totalSpent > maxSpent) {
        return false;
      }
    }

    // Event-specific condition checks
    switch (trigger.eventType) {
      case TriggerEventType.CART_ABANDONED:
        // Cart must have items
        return eventData?.cartItems && eventData.cartItems.length > 0;

      case TriggerEventType.TIER_UPGRADE:
        // Check if upgraded to target tier
        if (conditions.targetTiers && conditions.targetTiers.length > 0) {
          return conditions.targetTiers.includes(customer.tier);
        }
        return true;

      case TriggerEventType.PURCHASE_MILESTONE:
        // Check milestone count or amount
        if (conditions.milestoneCount) {
          return customer.visitCount >= conditions.milestoneCount;
        }
        if (conditions.milestoneAmount) {
          return customer.totalSpent >= conditions.milestoneAmount;
        }
        return true;

      default:
        return true;
    }
  }

  /**
   * Check if trigger can be executed (cooldown & max executions)
   */
  private async checkExecutionLimits(
    trigger: MarketingTriggerDocument,
    customerId: Types.ObjectId,
    tenantId: Types.ObjectId,
  ): Promise<boolean> {
    const { executionSettings } = trigger;

    if (!executionSettings) {
      return true;
    }

    // Check max executions per customer
    if (executionSettings.maxExecutionsPerCustomer) {
      const count = await this.executionLogModel.countDocuments({
        tenantId,
        customerId,
        triggerId: trigger._id,
        status: ExecutionStatus.SENT,
      });

      if (count >= executionSettings.maxExecutionsPerCustomer) {
        return false;
      }
    }

    // Check cooldown period
    if (executionSettings.cooldownDays) {
      const cooldownDate = new Date();
      cooldownDate.setDate(
        cooldownDate.getDate() - executionSettings.cooldownDays,
      );

      const recentExecution = await this.executionLogModel.findOne({
        tenantId,
        customerId,
        triggerId: trigger._id,
        status: ExecutionStatus.SENT,
        sentAt: { $gte: cooldownDate },
      });

      if (recentExecution) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute trigger - create execution log and queue for sending
   */
  private async executeTrigger(
    trigger: MarketingTriggerDocument,
    customerId: Types.ObjectId,
    tenantId: Types.ObjectId,
    eventData: any,
  ): Promise<void> {
    const { executionSettings } = trigger;

    // Calculate when to send
    let scheduledFor = new Date();
    if (
      trigger.eventType === TriggerEventType.CART_ABANDONED &&
      trigger.conditions?.abandonmentMinutes
    ) {
      scheduledFor = new Date(
        Date.now() + trigger.conditions.abandonmentMinutes * 60 * 1000,
      );
    }

    // Create execution log
    await this.executionLogModel.create({
      tenantId,
      triggerId: trigger._id,
      campaignId: trigger.campaignId,
      customerId,
      eventType: trigger.eventType,
      eventData,
      status: ExecutionStatus.PENDING,
      scheduledFor,
      metadata: {
        channel: executionSettings?.preferredChannel,
      },
    });

    // Update trigger stats
    await this.triggerModel.updateOne(
      { _id: trigger._id },
      {
        $inc: { totalTriggered: 1 },
        $set: { lastTriggeredAt: new Date() },
      },
    );

    this.logger.log(
      `Triggered ${trigger.eventType} for customer ${customerId}, scheduled for ${scheduledFor}`,
    );
  }

  /**
   * Get trigger execution logs
   */
  async getExecutionLogs(
    triggerId: string,
    tenantId: string,
    limit = 50,
  ): Promise<TriggerExecutionLog[]> {
    const logs = await this.executionLogModel
      .find({
        triggerId: new Types.ObjectId(triggerId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .populate("customerId", "name email phone")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return logs;
  }

  /**
   * Get trigger analytics
   */
  async getTriggerAnalytics(tenantId: string): Promise<any> {
    const tenantObjectId = new Types.ObjectId(tenantId);

    const [totalTriggers, activeTriggers, executions] = await Promise.all([
      this.triggerModel.countDocuments({ tenantId: tenantObjectId }),
      this.triggerModel.countDocuments({
        tenantId: tenantObjectId,
        status: TriggerStatus.ACTIVE,
      }),
      this.executionLogModel.aggregate([
        { $match: { tenantId: tenantObjectId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byStatus: any = {};
    executions.forEach((exec) => {
      byStatus[exec._id] = exec.count;
    });

    return {
      totalTriggers,
      activeTriggers,
      executionsByStatus: byStatus,
    };
  }
}
