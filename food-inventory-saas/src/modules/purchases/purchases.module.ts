import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PurchasesController } from "./purchases.controller";
import { PurchasesService } from "./purchases.service";
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    AuthModule,
    CustomersModule,
    forwardRef(() => ProductsModule),
    InventoryModule,
    AccountingModule,
    PayablesModule, // Add PayablesModule here
    EventsModule, // Add EventsModule here
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
