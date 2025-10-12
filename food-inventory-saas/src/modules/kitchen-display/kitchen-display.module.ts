import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KitchenDisplayController } from './kitchen-display.controller';
import { KitchenDisplayService } from './kitchen-display.service';
import {
  KitchenOrder,
  KitchenOrderSchema,
} from '../../schemas/kitchen-order.schema';
import { Order, OrderSchema } from '../../schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: KitchenOrder.name, schema: KitchenOrderSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [KitchenDisplayController],
  providers: [KitchenDisplayService],
  exports: [KitchenDisplayService],
})
export class KitchenDisplayModule {}
