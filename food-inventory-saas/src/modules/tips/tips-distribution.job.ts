import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { TipsService } from "./tips.service";

/**
 * Weekly Tips Distribution Job
 *
 * This service runs automatically to distribute tips to employees
 * based on configured distribution rules. Runs weekly on Monday at 1 AM.
 *
 * Functionality:
 * - Distributes tips from the previous week to eligible employees
 * - Uses active distribution rules for each tenant
 * - Creates TipsReport records for payroll integration
 * - Marks tips as distributed in order records
 */
@Injectable()
export class TipsDistributionJob {
  private readonly logger = new Logger(TipsDistributionJob.name);

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly tipsService: TipsService,
  ) {}

  /**
   * Runs weekly on Monday at 1 AM to distribute tips from previous week
   * Processes all active tenants with automatic tips distribution enabled
   */
  @Cron(CronExpression.MONDAY_TO_FRIDAY_AT_1AM)
  async distributeWeeklyTips() {
    this.logger.log("🔄 Starting weekly tips distribution job");

    const startTime = Date.now();

    try {
      // Get all active tenants with tips enabled
      const tenants = await this.tenantModel
        .find({
          status: { $in: ["active", "trial"] },
          "settings.tips.enabled": true,
        })
        .select("_id name settings.tips")
        .lean();

      if (!tenants || tenants.length === 0) {
        this.logger.log("No active tenants with tips enabled found");
        return;
      }

      this.logger.log(`Found ${tenants.length} tenant(s) with tips enabled`);

      let totalTenantsProcessed = 0;
      let totalTipsDistributed = 0;
      let totalEmployees = 0;
      let totalErrors = 0;

      // Define period: Previous week (Monday to Sunday)
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
      const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const lastMonday = new Date(today);
      lastMonday.setDate(today.getDate() - daysToLastMonday - 7);
      lastMonday.setHours(0, 0, 0, 0);

      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);

      this.logger.log(
        `Distribution period: ${lastMonday.toISOString()} to ${lastSunday.toISOString()}`,
      );

      // Process each tenant
      for (const tenant of tenants) {
        try {
          this.logger.log(
            `Processing tenant: ${tenant.name} (${tenant._id})`,
          );

          // Check if tenant has automatic distribution enabled
          const autoDistribute = (tenant as any).settings?.tips?.autoDistribute ?? false;
          if (!autoDistribute) {
            this.logger.log(
              `Tenant ${tenant.name} does not have automatic distribution enabled. Skipping.`,
            );
            continue;
          }

          // Find active distribution rule for this tenant
          const distributionRule = await this.tipsService.findActiveDistributionRule(
            tenant._id.toString(),
          );

          if (!distributionRule) {
            this.logger.warn(
              `Tenant ${tenant.name} has no active distribution rule. Skipping.`,
            );
            continue;
          }

          // Distribute tips for the week
          const result = await this.tipsService.distributeTips(
            {
              startDate: lastMonday.toISOString(),
              endDate: lastSunday.toISOString(),
              distributionRuleId: distributionRule._id.toString(),
            },
            tenant._id.toString(),
          );

          totalTenantsProcessed++;
          totalTipsDistributed += result.totalTips;
          totalEmployees += result.employeesIncluded;

          this.logger.log(
            `Tenant ${tenant.name}: Distributed $${result.totalTips.toFixed(2)} to ${result.employeesIncluded} employees`,
          );
        } catch (error) {
          totalErrors++;
          this.logger.error(
            `Error processing tenant ${tenant.name}: ${error.message}`,
            error.stack,
          );
          // Continue processing other tenants
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      this.logger.log(
        `✅ Tips distribution job completed in ${duration}s`,
      );
      this.logger.log(
        `   Tenants processed: ${totalTenantsProcessed} | Total distributed: $${totalTipsDistributed.toFixed(2)} | Employees: ${totalEmployees} | Errors: ${totalErrors}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Fatal error in tips distribution job: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Manual trigger for testing or on-demand distribution
   * Can be called via endpoint if needed
   */
  async manualDistribution(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    distributionRuleId?: string,
  ): Promise<{
    totalTips: number;
    employeesIncluded: number;
    distribution: any[];
  }> {
    this.logger.log(
      `Manual tips distribution triggered for tenant ${tenantId}`,
    );

    try {
      // If no distribution rule provided, find active one
      let ruleId = distributionRuleId;
      if (!ruleId) {
        const activeRule = await this.tipsService.findActiveDistributionRule(
          tenantId,
        );
        if (!activeRule) {
          throw new Error("No active distribution rule found for this tenant");
        }
        ruleId = activeRule._id.toString();
      }

      if (!ruleId) {
        throw new Error("Distribution rule id is required to distribute tips");
      }

      const result = await this.tipsService.distributeTips(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          distributionRuleId: ruleId,
        },
        tenantId,
      );

      this.logger.log(
        `Manual distribution completed: $${result.totalTips.toFixed(2)} to ${result.employeesIncluded} employees`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error in manual tips distribution: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
