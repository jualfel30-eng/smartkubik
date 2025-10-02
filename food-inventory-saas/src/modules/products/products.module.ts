import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { AuthModule } from "../../auth/auth.module";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { CustomersModule } from "../customers/customers.module"; // Reemplazo
import { InventoryModule } from "../inventory/inventory.module";
import { PurchasesModule } from "../purchases/purchases.module";
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    AuthModule,
    RolesModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    forwardRef(() => CustomersModule), // Reemplazo
    forwardRef(() => InventoryModule),
    forwardRef(() => PurchasesModule),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
