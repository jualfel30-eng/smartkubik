import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConsumablesService } from "./consumables.service";
import { ConsumablesController } from "./consumables.controller";
import { ConsumablesListener } from "./consumables.listener";
import {
  ProductConsumableConfig,
  ProductConsumableConfigSchema,
} from "../../schemas/product-consumable-config.schema";
import {
  ProductConsumableRelation,
  ProductConsumableRelationSchema,
} from "../../schemas/product-consumable-relation.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import {
  Inventory,
  InventorySchema,
  InventoryMovement,
  InventoryMovementSchema,
} from "../../schemas/inventory.schema";
import { UnitTypesModule } from "../unit-types/unit-types.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ProductConsumableConfig.name,
        schema: ProductConsumableConfigSchema,
      },
      {
        name: ProductConsumableRelation.name,
        schema: ProductConsumableRelationSchema,
      },
      {
        name: Product.name,
        schema: ProductSchema,
      },
      {
        name: Inventory.name,
        schema: InventorySchema,
      },
      {
        name: InventoryMovement.name,
        schema: InventoryMovementSchema,
      },
    ]),
    UnitTypesModule,
  ],
  controllers: [ConsumablesController],
  providers: [ConsumablesService, ConsumablesListener],
  exports: [ConsumablesService],
})
export class ConsumablesModule {}
