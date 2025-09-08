import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuthModule } from '../../auth/auth.module';
import { InventoryModule } from '../inventory/inventory.module';
import { Order, OrderSchema } from '../../schemas/order.schema';

@Module({
  imports: [
    AuthModule,
    InventoryModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

