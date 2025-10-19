import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FoodRetailController } from "./food-retail.controller";
import { FoodRetailInventoryService } from "./food-retail.service";
import { AuthModule } from "../../auth/auth.module";
import { EventsModule } from "../events/events.module";
import { ProductsModule } from "../products/products.module";
import { Inventory, InventorySchema } from "../../schemas/inventory.schema";
import {
  InventoryMovement,
  InventoryMovementSchema,
} from "../../schemas/inventory.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { RolesModule } from "../roles/roles.module";
import { IInventoryServiceProvider } from "../core/inventory.interface";

@Module({
  imports: [
    AuthModule,
    RolesModule,
    forwardRef(() => EventsModule),
    forwardRef(() => ProductsModule),
    MongooseModule.forFeature([
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [FoodRetailController],
  providers: [
    FoodRetailInventoryService,
    {
      provide: IInventoryServiceProvider,
      useClass: FoodRetailInventoryService,
    },
  ],
  exports: [FoodRetailInventoryService, IInventoryServiceProvider],
})
export class FoodRetailModule {}
