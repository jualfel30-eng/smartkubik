import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { ProductAffinityService } from "../../services/product-affinity.service";

/**
 * Update Affinity Scores Job
 * Phase 2: Product Affinity Cache + Cron Job
 *
 * This service runs daily at 2 AM to recalculate all customer-product
 * affinity scores across all tenants. This ensures the cache is always
 * up-to-date for targeted marketing campaigns and recommendations.
 *
 * Functionality:
 * - Recalculates affinity scores for all customer-product combinations
 * - Updates engagement levels and customer segments
 * - Predicts next purchase dates
 * - Identifies at-risk customers
 */
@Injectable()
export class UpdateAffinityScoresJob {
  private readonly logger = new Logger(UpdateAffinityScoresJob.name);

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly productAffinityService: ProductAffinityService,
  ) {}

  /**
   * Runs daily at 2 AM to recalculate all affinity scores
   * Processes all active tenants sequentially
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async updateAllAffinityScores() {
    this.logger.log("🔄 Starting daily affinity scores update job");

    const startTime = Date.now();

    try {
      // Get all active tenants
      const tenants = await this.tenantModel
        .find({
          status: { $in: ["active", "trial"] },
        })
        .select("_id name")
        .lean();

      if (!tenants || tenants.length === 0) {
        this.logger.log("No active tenants found");
        return;
      }

      this.logger.log(`Found ${tenants.length} active tenant(s) to process`);

      let totalProcessed = 0;
      let totalUpdated = 0;
      let totalErrors = 0;

      // Process each tenant
      for (const tenant of tenants) {
        try {
          this.logger.log(`Processing tenant: ${tenant.name} (${tenant._id})`);

          const result =
            await this.productAffinityService.recalculateAllAffinityScores(
              tenant._id.toString(),
            );

          totalProcessed += result.processed;
          totalUpdated += result.updated;
          totalErrors += result.errors;

          this.logger.log(
            `Tenant ${tenant.name}: ${result.updated} affinities updated, ${result.errors} errors`,
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
        `✅ Affinity scores update job completed in ${duration}s`,
      );
      this.logger.log(
        `   Tenants: ${tenants.length} | Processed: ${totalProcessed} | Updated: ${totalUpdated} | Errors: ${totalErrors}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Fatal error in affinity scores update job: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Manual trigger for testing or on-demand updates
   * Can be called via endpoint if needed
   */
  async manualUpdate(tenantId: string): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    this.logger.log(`Manual affinity update triggered for tenant ${tenantId}`);

    try {
      const result =
        await this.productAffinityService.recalculateAllAffinityScores(
          tenantId,
        );

      this.logger.log(
        `Manual update completed: ${result.updated} updated, ${result.errors} errors`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error in manual affinity update: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
