import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { AuthModule } from "../../auth/auth.module";
import { EventsModule } from "../events/events.module";
import { ProductsModule } from "../products/products.module"; // Import ProductsModule
import { Inventory, InventorySchema } from "../../schemas/inventory.schema";
import {
  InventoryMovement,
  InventoryMovementSchema,
} from "../../schemas/inventory.schema";
import { Product, ProductSchema } from "../../schemas/product.schema"; // Import Product schema
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    AuthModule,
    RolesModule,
    forwardRef(() => EventsModule),
    forwardRef(() => ProductsModule), // Use forwardRef if there is a circular dependency
    MongooseModule.forFeature([
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: Product.name, schema: ProductSchema }, // Add ProductModel to feature module
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
