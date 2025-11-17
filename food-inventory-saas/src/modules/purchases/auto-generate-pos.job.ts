import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Model, Types } from "mongoose";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { PurchasesService } from "./purchases.service";

/**
 * Auto-generate Purchase Orders Job
 * Phase 1.4: Auto-generation scheduled job
 *
 * This service runs daily at 2 AM to automatically generate purchase orders
 * for products with low stock levels across all tenants.
 */
@Injectable()
export class AutoGeneratePOsJob {
  private readonly logger = new Logger(AutoGeneratePOsJob.name);

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly purchasesService: PurchasesService,
  ) {}

  /**
   * Runs daily at 2 AM to auto-generate purchase orders
   * for products below minimum stock levels
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async autoGeneratePurchaseOrders() {
    this.logger.log("Starting auto-generate purchase orders job");

    try {
      // Get all active tenants
      const tenants = await this.tenantModel
        .find({
          status: { $in: ["active", "trial"] },
        })
        .select("_id name settings")
        .lean();

      if (!tenants || tenants.length === 0) {
        this.logger.log("No active tenants found");
        return;
      }

      this.logger.log(`Found ${tenants.length} active tenant(s) to process`);

      let totalPOsGenerated = 0;

      // Process each tenant
      for (const tenant of tenants) {
        try {
          // Check if auto-generation is enabled for this tenant
          const autoGenEnabled = (tenant.settings as any)?.purchases
            ?.autoGeneratePOs;

          if (autoGenEnabled === false) {
            this.logger.debug(
              `Auto-generation disabled for tenant ${tenant.name}`,
            );
            continue;
          }

          const tenantId = this.normalizeTenantId(tenant._id);
          if (!tenantId) {
            this.logger.warn(`Invalid tenant ID for ${tenant.name}`);
            continue;
          }

          this.logger.log(
            `Processing tenant: ${tenant.name} (${tenantId})`,
          );

          // Generate POs for this tenant
          const generatedPOs = await this.purchasesService.autoGeneratePOs(
            tenantId,
          );

          if (generatedPOs && generatedPOs.length > 0) {
            this.logger.log(
              `Generated ${generatedPOs.length} purchase order(s) for tenant ${tenant.name}`,
            );
            totalPOsGenerated += generatedPOs.length;
          } else {
            this.logger.debug(
              `No purchase orders needed for tenant ${tenant.name}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error processing tenant ${tenant.name}: ${error instanceof Error ? error.message : error}`,
            error instanceof Error ? error.stack : undefined,
          );
          // Continue with next tenant even if one fails
        }
      }

      this.logger.log(
        `Auto-generate job completed. Total POs generated: ${totalPOsGenerated}`,
      );
    } catch (error) {
      this.logger.error(
        `Error in auto-generate purchase orders job: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Optional: Run weekly summary report on Mondays at 9 AM
   * Sends a summary of auto-generated POs from the previous week
   */
  @Cron(CronExpression.MONDAY_TO_FRIDAY_AT_9AM)
  async sendWeeklySummary() {
    // This can be implemented later to send reports
    this.logger.debug("Weekly PO summary job (not yet implemented)");
  }

  /**
   * Normalize tenant ID to string
   */
  private normalizeTenantId(
    tenantId: Types.ObjectId | string | undefined,
  ): string | undefined {
    if (!tenantId) return undefined;
    if (tenantId instanceof Types.ObjectId) return tenantId.toHexString();
    if (typeof tenantId === "string") return tenantId;
    return undefined;
  }
}
