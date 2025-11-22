import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { MarketingTriggerService } from "./marketing-trigger.service";
import { TriggerEventType } from "../../schemas/marketing-trigger.schema";

/**
 * EventListenerService - Detects behavioral events and triggers automated campaigns
 *
 * Runs periodic checks for:
 * - Cart abandonment
 * - Customer inactivity
 * - Birthdays
 * - Anniversaries
 */
@Injectable()
export class EventListenerService {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    private triggerService: MarketingTriggerService,
  ) {}

  /**
   * Check for customer inactivity (runs daily at 9 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkInactiveCustomers() {
    this.logger.log("Checking for inactive customers...");

    try {
      // Get all tenants with active inactivity triggers
      const inactivityTriggers = await this.triggerService["triggerModel"]
        .find({
          eventType: TriggerEventType.INACTIVITY,
          status: "active",
        })
        .lean();

      if (inactivityTriggers.length === 0) {
        return;
      }

      // Group triggers by tenant
      const triggersByTenant = new Map<string, any[]>();
      inactivityTriggers.forEach((trigger) => {
        const tenantId = trigger.tenantId.toString();
        if (!triggersByTenant.has(tenantId)) {
          triggersByTenant.set(tenantId, []);
        }
        triggersByTenant.get(tenantId)!.push(trigger);
      });

      // Process each tenant
      for (const [tenantId, triggers] of triggersByTenant) {
        for (const trigger of triggers) {
          const inactiveDays = trigger.conditions?.inactiveDays || 30;
          const inactiveDate = new Date();
          inactiveDate.setDate(inactiveDate.getDate() - inactiveDays);

          // Find customers who haven't visited since inactiveDate
          const inactiveCustomers = await this.customerModel
            .find({
              tenantId: new Types.ObjectId(tenantId),
              lastVisit: { $lte: inactiveDate },
              visitCount: { $gte: 1 }, // Must have visited at least once
            })
            .lean();

          this.logger.log(
            `Found ${inactiveCustomers.length} inactive customers (${inactiveDays}+ days) for tenant ${tenantId}`,
          );

          // Trigger campaign for each inactive customer
          for (const customer of inactiveCustomers) {
            const daysSinceLastVisit = customer.lastVisit
              ? Math.floor(
                  (Date.now() - customer.lastVisit.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 0;

            await this.triggerService.processEvent(
              TriggerEventType.INACTIVITY,
              customer._id.toString(),
              tenantId,
              { daysSinceLastVisit },
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking inactive customers: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Check for customer birthdays (runs daily at 8 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkBirthdays() {
    this.logger.log("Checking for customer birthdays...");

    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();

      // Get all tenants with active birthday triggers
      const birthdayTriggers = await this.triggerService["triggerModel"]
        .find({
          eventType: TriggerEventType.CUSTOMER_BIRTHDAY,
          status: "active",
        })
        .lean();

      if (birthdayTriggers.length === 0) {
        return;
      }

      // Group by tenant
      const triggersByTenant = new Map<string, any[]>();
      birthdayTriggers.forEach((trigger) => {
        const tenantId = trigger.tenantId.toString();
        if (!triggersByTenant.has(tenantId)) {
          triggersByTenant.set(tenantId, []);
        }
        triggersByTenant.get(tenantId)!.push(trigger);
      });

      // Process each tenant
      for (const [tenantId] of triggersByTenant) {
        // Find customers with birthday today
        const birthdayCustomers = await this.customerModel
          .find({
            tenantId: new Types.ObjectId(tenantId),
            $expr: {
              $and: [
                { $eq: [{ $month: "$dateOfBirth" }, month] },
                { $eq: [{ $dayOfMonth: "$dateOfBirth" }, day] },
              ],
            },
          })
          .lean();

        this.logger.log(
          `Found ${birthdayCustomers.length} customers with birthdays today for tenant ${tenantId}`,
        );

        // Trigger birthday campaign for each customer
        for (const customer of birthdayCustomers) {
          await this.triggerService.processEvent(
            TriggerEventType.CUSTOMER_BIRTHDAY,
            customer._id.toString(),
            tenantId,
            { birthday: customer.dateOfBirth },
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking birthdays: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Check for registration anniversaries (runs daily at 8 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkAnniversaries() {
    this.logger.log("Checking for registration anniversaries...");

    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();

      // Get all tenants with active anniversary triggers
      const anniversaryTriggers = await this.triggerService["triggerModel"]
        .find({
          eventType: TriggerEventType.REGISTRATION_ANNIVERSARY,
          status: "active",
        })
        .lean();

      if (anniversaryTriggers.length === 0) {
        return;
      }

      // Group by tenant
      const triggersByTenant = new Map<string, any[]>();
      anniversaryTriggers.forEach((trigger) => {
        const tenantId = trigger.tenantId.toString();
        if (!triggersByTenant.has(tenantId)) {
          triggersByTenant.set(tenantId, []);
        }
        triggersByTenant.get(tenantId)!.push(trigger);
      });

      // Process each tenant
      for (const [tenantId] of triggersByTenant) {
        // Find customers with anniversary today (any year)
        const anniversaryCustomers = await this.customerModel
          .find({
            tenantId: new Types.ObjectId(tenantId),
            $expr: {
              $and: [
                { $eq: [{ $month: "$createdAt" }, month] },
                { $eq: [{ $dayOfMonth: "$createdAt" }, day] },
                { $ne: [{ $year: "$createdAt" }, today.getFullYear()] }, // Not registered today
              ],
            },
          })
          .lean();

        this.logger.log(
          `Found ${anniversaryCustomers.length} customers with anniversaries today for tenant ${tenantId}`,
        );

        // Trigger anniversary campaign for each customer
        for (const customer of anniversaryCustomers) {
          const yearsAgo = customer.createdAt
            ? today.getFullYear() - customer.createdAt.getFullYear()
            : 0;

          await this.triggerService.processEvent(
            TriggerEventType.REGISTRATION_ANNIVERSARY,
            customer._id.toString(),
            tenantId,
            { years: yearsAgo },
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking anniversaries: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Manual trigger for first purchase (called by OrdersService after order creation)
   */
  async onFirstPurchase(customerId: string, tenantId: string, orderData: any) {
    this.logger.log(`First purchase detected for customer ${customerId}`);

    await this.triggerService.processEvent(
      TriggerEventType.FIRST_PURCHASE,
      customerId,
      tenantId,
      orderData,
    );
  }

  /**
   * Manual trigger for tier upgrade (called by LoyaltyService)
   */
  async onTierUpgrade(
    customerId: string,
    tenantId: string,
    oldTier: string,
    newTier: string,
  ) {
    this.logger.log(
      `Tier upgrade detected for customer ${customerId}: ${oldTier} -> ${newTier}`,
    );

    await this.triggerService.processEvent(
      TriggerEventType.TIER_UPGRADE,
      customerId,
      tenantId,
      { oldTier, newTier },
    );
  }

  /**
   * Manual trigger for purchase milestone (called by OrdersService)
   */
  async onPurchaseMilestone(
    customerId: string,
    tenantId: string,
    milestoneData: { count?: number; amount?: number },
  ) {
    this.logger.log(`Purchase milestone reached for customer ${customerId}`);

    await this.triggerService.processEvent(
      TriggerEventType.PURCHASE_MILESTONE,
      customerId,
      tenantId,
      milestoneData,
    );
  }
}
