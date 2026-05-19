import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

@Injectable()
export class ExtendTenantPaymentConfigForPaymentRequestsMigration {
  private readonly logger = new Logger(
    ExtendTenantPaymentConfigForPaymentRequestsMigration.name,
  );

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run(): Promise<{
    updatedRequirePaymentProof: number;
    updatedAllowPartialPayments: number;
    updatedExpiryDays: number;
  }> {
    const db = this.connection.db;
    const collection = db.collection("tenantpaymentconfigs");

    this.logger.log(
      "🔄 Extending tenantpaymentconfigs with PaymentRequest settings...",
    );

    const r1 = await collection.updateMany(
      { requirePaymentProof: { $exists: false } },
      { $set: { requirePaymentProof: false } },
    );
    const r2 = await collection.updateMany(
      { allowPartialPayments: { $exists: false } },
      { $set: { allowPartialPayments: false } },
    );
    const r3 = await collection.updateMany(
      { paymentRequestExpiryDays: { $exists: false } },
      { $set: { paymentRequestExpiryDays: 7 } },
    );

    this.logger.log(
      `✅ Extended tenantpaymentconfigs (requirePaymentProof: ${r1.modifiedCount}, allowPartialPayments: ${r2.modifiedCount}, expiryDays: ${r3.modifiedCount})`,
    );

    return {
      updatedRequirePaymentProof: r1.modifiedCount,
      updatedAllowPartialPayments: r2.modifiedCount,
      updatedExpiryDays: r3.modifiedCount,
    };
  }
}
