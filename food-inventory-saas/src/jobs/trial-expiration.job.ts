import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../schemas/tenant.schema";
import { MailService } from "../modules/mail/mail.service";

@Injectable()
export class TrialExpirationJob {
  private readonly logger = new Logger(TrialExpirationJob.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private readonly mailService: MailService,
  ) {}

  /**
   * Check for expired trials daily at 8 AM (Venezuela business hours).
   * Sends notification emails to tenant owners.
   * TenantGuard already blocks access via subscriptionExpiresAt — this job
   * only handles notifications so tenants know their trial ended.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleTrialExpiration() {
    this.logger.log("Starting trial expiration check...");

    try {
      const expiredTrials = await this.tenantModel
        .find({
          subscriptionPlan: "Trial",
          status: "active",
          trialEndDate: { $lt: new Date() },
        })
        .exec();

      if (expiredTrials.length === 0) {
        this.logger.log("No expired trials found.");
        return;
      }

      this.logger.log(
        `Found ${expiredTrials.length} expired trial(s). Sending notifications...`,
      );

      let sent = 0;
      let failed = 0;

      for (const tenant of expiredTrials) {
        const email = tenant.contactInfo?.email;
        if (!email) {
          this.logger.warn(
            `Tenant ${tenant.name} (${tenant._id}) has no contact email, skipping.`,
          );
          failed++;
          continue;
        }

        try {
          await this.mailService.sendTrialExpiredEmail(email, {
            businessName: tenant.name,
            ownerFirstName: tenant.ownerFirstName || "",
          });
          sent++;
        } catch (error) {
          this.logger.error(
            `Failed to send trial expiration email to ${email}: ${error.message}`,
          );
          failed++;
        }
      }

      this.logger.log(
        `Trial expiration check completed: ${sent} notified, ${failed} failed.`,
      );
    } catch (error) {
      this.logger.error(
        `Trial expiration job failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
