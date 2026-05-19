import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PaymentRequestsService } from "../services/payment-requests.service";

/**
 * Daily sweep that moves untouched `pending` PaymentRequests past their
 * `expiresAt` into the `expired` terminal state. Tenant-configurable expiry
 * is enforced at creation time; this job just enforces the deadline.
 */
@Injectable()
export class ExpireStalePaymentRequestsJob {
  private readonly logger = new Logger(ExpireStalePaymentRequestsJob.name);

  constructor(
    private readonly paymentRequestsService: PaymentRequestsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: "expire-stale-payment-requests",
  })
  async run(): Promise<void> {
    this.logger.log("Running expire-stale-payment-requests job...");
    try {
      const count = await this.paymentRequestsService.expireStale();
      this.logger.log(`expire-stale-payment-requests: ${count} expired`);
    } catch (err) {
      this.logger.error(
        `expire-stale-payment-requests failed: ${err?.message}`,
        err?.stack,
      );
    }
  }
}
