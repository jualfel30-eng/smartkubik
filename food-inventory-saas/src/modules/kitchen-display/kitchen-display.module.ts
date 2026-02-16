import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { KitchenDisplayController } from "./kitchen-display.controller";
import { KitchenDisplayService } from "./kitchen-display.service";
import {
  KitchenOrder,
  KitchenOrderSchema,
} from "../../schemas/kitchen-order.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { ProductSchema } from "../../schemas/product.schema";

import { KitchenDisplayListener } from "./kitchen-display.listener";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: KitchenOrder.name, schema: KitchenOrderSchema },
      { name: Order.name, schema: OrderSchema },
      { name: 'Product', schema: ProductSchema },
    ]),
  ],
  controllers: [KitchenDisplayController],
  providers: [KitchenDisplayService, KitchenDisplayListener],
  exports: [KitchenDisplayService],
})
export class KitchenDisplayModule { }
