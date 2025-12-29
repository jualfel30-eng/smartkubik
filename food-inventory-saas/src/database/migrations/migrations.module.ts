import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MigrationsController } from "./migrations.controller";
import { AddMarketingPermissionsMigration } from "./add-marketing-permissions.migration";
import { PopulateTransactionHistoryMigration } from "./populate-transaction-history.migration";
import { RebuildProductAffinityMigration } from "./rebuild-product-affinity.migration";
import { SeedDefaultWarehousesMigration } from "./seed-default-warehouses.migration";
import { LinkPaymentsToOrdersMigration } from "./link-payments-to-orders.migration";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { Payment, PaymentSchema } from "../../schemas/payment.schema";
import {
  CustomerTransactionHistory,
  CustomerTransactionHistorySchema,
} from "../../schemas/customer-transaction-history.schema";
import {
  ProductAffinity,
  ProductAffinitySchema,
} from "../../schemas/product-affinity.schema";
import { TransactionHistoryModule } from "../../modules/transaction-history/transaction-history.module";
import { ProductAffinityModule } from "../../modules/product-affinity/product-affinity.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Payment.name, schema: PaymentSchema },
      {
        name: CustomerTransactionHistory.name,
        schema: CustomerTransactionHistorySchema,
      },
      { name: ProductAffinity.name, schema: ProductAffinitySchema },
    ]),
    TransactionHistoryModule,
    ProductAffinityModule,
  ],
  controllers: [MigrationsController],
  providers: [
    AddMarketingPermissionsMigration,
    PopulateTransactionHistoryMigration,
    RebuildProductAffinityMigration,
    SeedDefaultWarehousesMigration,
    LinkPaymentsToOrdersMigration,
  ],
  exports: [
    AddMarketingPermissionsMigration,
    PopulateTransactionHistoryMigration,
    RebuildProductAffinityMigration,
    SeedDefaultWarehousesMigration,
    LinkPaymentsToOrdersMigration,
  ],
})
export class MigrationsModule {}
