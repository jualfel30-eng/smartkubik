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

import { InventoryModule } from "../inventory/inventory.module";
import { AccountingModule } from "../accounting/accounting.module";
import { PayablesModule } from "../payables/payables.module"; // Import PayablesModule

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    AuthModule,
    CustomersModule,
    forwardRef(() => ProductsModule),
    InventoryModule,
    AccountingModule,
    PayablesModule, // Add PayablesModule here
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}