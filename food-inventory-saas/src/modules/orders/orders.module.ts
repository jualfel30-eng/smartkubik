import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuthModule } from '../../auth/auth.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomersModule } from '../customers/customers.module';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { Customer, CustomerSchema } from '../../schemas/customer.schema';
import { Product, ProductSchema } from '../../schemas/product.schema';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';

import { PaymentsModule } from '../payments/payments.module';
import { AccountingModule } from '../accounting/accounting.module'; // Import AccountingModule

@Module({
  imports: [
    AuthModule,
    InventoryModule,
    CustomersModule,
    PaymentsModule, // Importar PaymentsModule para usar PaymentsService
    AccountingModule, // Add AccountingModule to imports
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Tenant.name, schema: TenantSchema }, // Añadir TenantSchema
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
