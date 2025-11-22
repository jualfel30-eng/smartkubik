import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TransactionHistoryController } from "../../controllers/transaction-history.controller";
import { TransactionHistoryService } from "../../services/transaction-history.service";
import {
  CustomerTransactionHistory,
  CustomerTransactionHistorySchema,
} from "../../schemas/customer-transaction-history.schema";
import {
  SupplierTransactionHistory,
  SupplierTransactionHistorySchema,
} from "../../schemas/supplier-transaction-history.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from "../../schemas/purchase-order.schema";
import { ProductAffinityModule } from "../product-affinity/product-affinity.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: CustomerTransactionHistory.name,
        schema: CustomerTransactionHistorySchema,
      },
      {
        name: SupplierTransactionHistory.name,
        schema: SupplierTransactionHistorySchema,
      },
      { name: Order.name, schema: OrderSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
    ]),
    forwardRef(() => ProductAffinityModule),
  ],
  controllers: [TransactionHistoryController],
  providers: [TransactionHistoryService],
  exports: [TransactionHistoryService],
})
export class TransactionHistoryModule {}
