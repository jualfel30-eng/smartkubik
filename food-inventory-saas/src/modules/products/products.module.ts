import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProductsController } from "./products.controller";
import { ProductsPublicController } from "./products-public.controller";
import { ProductsService } from "./products.service";
import { AuthModule } from "../../auth/auth.module";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import {
  ProductConsumableConfig,
  ProductConsumableConfigSchema,
} from "../../schemas/product-consumable-config.schema";
import { Inventory, InventorySchema } from "../../schemas/inventory.schema";
import { CustomersModule } from "../customers/customers.module"; // Reemplazo
import { InventoryModule } from "../inventory/inventory.module";
import { PurchasesModule } from "../purchases/purchases.module";
import { RolesModule } from "../roles/roles.module";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    RolesModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Tenant.name, schema: TenantSchema },
      {
        name: ProductConsumableConfig.name,
        schema: ProductConsumableConfigSchema,
      },
      { name: Inventory.name, schema: InventorySchema },
    ]),
    forwardRef(() => CustomersModule), // Reemplazo
    forwardRef(() => InventoryModule),
    forwardRef(() => PurchasesModule),
  ],
  controllers: [ProductsController, ProductsPublicController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
