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
import {
  Inventory,
  InventorySchema,
  InventoryMovement,
  InventoryMovementSchema,
} from "../../schemas/inventory.schema";
import { CustomersModule } from "../customers/customers.module"; // Reemplazo
import { SuppliersModule } from "../suppliers/suppliers.module"; // Added
import { InventoryModule } from "../inventory/inventory.module";
import { PurchasesModule } from "../purchases/purchases.module";
import { RolesModule } from "../roles/roles.module";
import { OpenaiModule } from "../openai/openai.module";

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
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
    ]),
    forwardRef(() => CustomersModule), // Reemplazo
    forwardRef(() => InventoryModule),
    forwardRef(() => PurchasesModule),
    forwardRef(() => SuppliersModule),
    forwardRef(() => OpenaiModule),
  ],
  controllers: [ProductsController, ProductsPublicController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule { }
