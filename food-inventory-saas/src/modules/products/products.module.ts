import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { AuthModule } from "../../auth/auth.module";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { CustomersModule } from "../customers/customers.module"; // Reemplazo
import { InventoryModule } from "../inventory/inventory.module";
import { PurchasesModule } from "../purchases/purchases.module";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    forwardRef(() => CustomersModule), // Reemplazo
    forwardRef(() => InventoryModule),
    forwardRef(() => PurchasesModule),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
