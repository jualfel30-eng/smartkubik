import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { IntelligenceService } from "./intelligence.service";
import { ProactiveNotifierService } from "./proactive-notifier.service";

@Injectable()
export class IntelligenceSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(IntelligenceSchedulerService.name);
  private metricsInterval: NodeJS.Timeout | null = null;
  private insightsInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly intelligenceService: IntelligenceService,
    private readonly proactiveNotifier: ProactiveNotifierService,
  ) {}

  onModuleInit() {
    // Calculate metrics every hour
    this.metricsInterval = setInterval(
      () => this.runMetricsForAllTenants(),
      60 * 60 * 1000, // 1 hour
    );

    // Send daily insights at 8 AM (check every 30 minutes)
    this.insightsInterval = setInterval(
      () => this.checkAndSendDailyInsights(),
      30 * 60 * 1000, // 30 minutes
    );

    this.logger.log(
      "Intelligence scheduler initialized: metrics every 1h, insights check every 30m",
    );
  }

  /**
   * Run metrics calculation for all active tenants with AI enabled.
   */
  private async runMetricsForAllTenants(): Promise<void> {
    try {
      const tenants = await this.tenantModel
        .find({
          status: "active",
          "aiAssistant.autoReplyEnabled": true,
        })
        .select("_id businessName")
        .lean();

      this.logger.log(
        `Running metrics calculation for ${tenants.length} active AI tenants`,
      );

      for (const tenant of tenants) {
        try {
          await this.intelligenceService.calculateMetrics(
            tenant._id.toString(),
          );
        } catch (error) {
          this.logger.error(
            `Metrics calculation failed for tenant ${tenant._id}: ${(error as Error).message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `runMetricsForAllTenants failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Check if it's time to send daily insights (8 AM local time).
   */
  private async checkAndSendDailyInsights(): Promise<void> {
    const now = new Date();
    const hour = now.getHours(); // Server time (VPS in Venezuela timezone)

    // Send between 7:30 and 8:30 AM
    if (hour !== 8) return;

    // Use minutes to avoid sending twice in the same hour
    const minutes = now.getMinutes();
    if (minutes > 30) return;

    try {
      const tenants = await this.tenantModel
        .find({
          status: "active",
          "aiAssistant.autoReplyEnabled": true,
          "aiAssistant.ownerPhone": { $exists: true, $ne: "" },
        })
        .select("_id")
        .lean();

      this.logger.log(
        `Sending daily insights to ${tenants.length} tenants with ownerPhone configured`,
      );

      for (const tenant of tenants) {
        try {
          await this.proactiveNotifier.sendDailyInsights(
            tenant._id.toString(),
          );
        } catch (error) {
          this.logger.error(
            `Daily insights failed for tenant ${tenant._id}: ${(error as Error).message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `checkAndSendDailyInsights failed: ${(error as Error).message}`,
      );
    }
  }
}
