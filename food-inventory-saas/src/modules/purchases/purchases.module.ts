import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { PurchasesController } from "./purchases.controller";
import { PurchasesService } from "./purchases.service";
import { AutoGeneratePOsJob } from "./auto-generate-pos.job";
import { ProductsModule } from "../products/products.module";
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from "../../schemas/purchase-order.schema";
import { AuthModule } from "../../auth/auth.module";
import { CustomersModule } from "../customers/customers.module";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { InventoryModule } from "../inventory/inventory.module";
import { AccountingModule } from "../accounting/accounting.module";
import { PayablesModule } from "../payables/payables.module"; // Import PayablesModule
import { EventsModule } from "../events/events.module"; // Import EventsModule
import { TransactionHistoryModule } from "../transaction-history/transaction-history.module"; // Import TransactionHistoryModule

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    ScheduleModule.forRoot(),
    AuthModule,
    CustomersModule,
    forwardRef(() => ProductsModule),
    InventoryModule,
    AccountingModule,
    PayablesModule, // Add PayablesModule here
    EventsModule, // Add EventsModule here
    TransactionHistoryModule, // Add TransactionHistoryModule here
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService, AutoGeneratePOsJob],
  exports: [PurchasesService],
})
export class PurchasesModule {}
