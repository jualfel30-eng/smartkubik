import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { TransactionHistoryService } from "../../services/transaction-history.service";

@Injectable()
export class PopulateTransactionHistoryMigration {
  private readonly logger = new Logger(
    PopulateTransactionHistoryMigration.name,
  );

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly transactionHistoryService: TransactionHistoryService,
  ) {}

  async run(): Promise<void> {
    try {
      this.logger.log(
        "🔄 Starting transaction history population migration...",
      );

      // Find all PAID orders that have a customer (venta = pago)
      const paidOrders = await this.orderModel
        .find({
          paymentStatus: "paid",
          customerId: { $exists: true, $ne: null },
        })
        .select("_id orderNumber customerId tenantId paymentStatus")
        .lean()
        .exec();

      this.logger.log(`📊 Found ${paidOrders.length} paid orders to process`);

      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const order of paidOrders) {
        try {
          const transaction =
            await this.transactionHistoryService.recordCustomerTransaction(
              order._id.toString(),
              order.tenantId.toString(),
            );

          if (transaction) {
            successCount++;
            if (successCount % 100 === 0) {
              this.logger.log(`✅ Processed ${successCount} orders...`);
            }
          } else {
            skippedCount++;
          }
        } catch (error) {
          errorCount++;
          this.logger.error(
            `❌ Error processing order ${order.orderNumber}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `✅ Migration completed. Success: ${successCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error("❌ Error running migration:", error.message);
      throw error;
    }
  }

  /**
   * Rollback method - removes all transaction history records
   * USE WITH CAUTION - This will delete all transaction history data
   */
  async rollback(): Promise<void> {
    try {
      this.logger.warn("⚠️  Starting transaction history rollback...");

      const db = this.connection.db;
      const customerTransactionsCollection = db.collection(
        "customertransactionhistories",
      );

      const result = await customerTransactionsCollection.deleteMany({});

      this.logger.warn(
        `⚠️  Rollback completed. Deleted ${result.deletedCount} transaction records`,
      );
    } catch (error) {
      this.logger.error("❌ Error during rollback:", error.message);
      throw error;
    }
  }
}
