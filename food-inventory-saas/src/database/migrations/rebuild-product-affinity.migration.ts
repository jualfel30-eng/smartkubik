import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";
import {
  CustomerTransactionHistory,
  CustomerTransactionHistoryDocument,
} from "../../schemas/customer-transaction-history.schema";
import {
  ProductAffinity,
  ProductAffinityDocument,
} from "../../schemas/product-affinity.schema";
import { ProductAffinityService } from "../../services/product-affinity.service";

@Injectable()
export class RebuildProductAffinityMigration {
  private readonly logger = new Logger(RebuildProductAffinityMigration.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(CustomerTransactionHistory.name)
    private transactionModel: Model<CustomerTransactionHistoryDocument>,
    @InjectModel(ProductAffinity.name)
    private productAffinityModel: Model<ProductAffinityDocument>,
    private readonly productAffinityService: ProductAffinityService,
  ) {}

  /**
   * Rebuild product affinity matrix from all existing transactions
   */
  async run(): Promise<void> {
    try {
      this.logger.log("🔄 Starting product affinity matrix rebuild...");

      // Get all transactions
      const transactions = await this.transactionModel
        .find({})
        .select("_id orderNumber tenantId customerId items")
        .lean()
        .exec();

      this.logger.log(
        `📊 Found ${transactions.length} transactions to process`,
      );

      let successCount = 0;
      let errorCount = 0;

      for (const transaction of transactions) {
        try {
          await this.productAffinityService.updateAffinityFromTransaction(
            transaction._id.toString(),
            transaction.tenantId.toString(),
          );

          successCount++;

          if (successCount % 10 === 0) {
            this.logger.log(
              `✅ Processed ${successCount}/${transactions.length} transactions...`,
            );
          }
        } catch (error) {
          errorCount++;
          this.logger.error(
            `❌ Error processing transaction ${transaction.orderNumber}: ${error.message}`,
          );
        }
      }

      // Log summary statistics
      const affinityCount = await this.productAffinityModel.countDocuments();

      this.logger.log(`\n✅ Product affinity matrix rebuild completed!`);
      this.logger.log(`   Transactions processed: ${successCount}`);
      this.logger.log(`   Errors: ${errorCount}`);
      this.logger.log(`   Product affinity records created: ${affinityCount}`);
      this.logger.log(`\n📊 Summary:`);

      // Show sample statistics
      const sampleAffinity = await this.productAffinityModel
        .findOne()
        .sort({ totalUniqueCustomers: -1 })
        .lean()
        .exec();

      if (sampleAffinity) {
        this.logger.log(
          `   Most popular product: ${sampleAffinity.productName}`,
        );
        this.logger.log(
          `   - Unique customers: ${sampleAffinity.totalUniqueCustomers}`,
        );
        this.logger.log(
          `   - Total transactions: ${sampleAffinity.totalTransactions}`,
        );
        this.logger.log(
          `   - Total revenue: $${sampleAffinity.totalRevenue.toFixed(2)}`,
        );
        this.logger.log(
          `   - Co-purchase patterns: ${sampleAffinity.coPurchasePatterns.length}`,
        );
      }
    } catch (error) {
      this.logger.error("❌ Error running migration:", error.message);
      throw error;
    }
  }

  /**
   * Rollback method - removes all product affinity records
   * USE WITH CAUTION - This will delete all product affinity data
   */
  async rollback(): Promise<void> {
    try {
      this.logger.warn("⚠️  Starting product affinity rollback...");

      const result = await this.productAffinityModel.deleteMany({});

      this.logger.warn(
        `⚠️  Rollback completed. Deleted ${result.deletedCount} product affinity records`,
      );
    } catch (error) {
      this.logger.error("❌ Error during rollback:", error.message);
      throw error;
    }
  }
}
