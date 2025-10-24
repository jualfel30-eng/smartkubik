import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OrdersController } from "./orders.controller";
import { OrdersPublicController } from "./orders-public.controller";
import { OrdersService } from "./orders.service";
import { AuthModule } from "../../auth/auth.module";
import { InventoryModule } from "../inventory/inventory.module";
import { CustomersModule } from "../customers/customers.module";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import {
  BankAccount,
  BankAccountSchema,
} from "../../schemas/bank-account.schema";
import { User, UserSchema } from "../../schemas/user.schema";
import { RolesModule } from "../roles/roles.module";
import { PaymentsModule } from "../payments/payments.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { ShiftsModule } from "../shifts/shifts.module";
import { ExchangeRateModule } from "../exchange-rate/exchange-rate.module";
import { TaskQueueModule } from "../task-queue/task-queue.module";

@Module({
  imports: [
    AuthModule,
    InventoryModule,
    CustomersModule,
    RolesModule,
    PaymentsModule,
    DeliveryModule,
    ShiftsModule,
    ExchangeRateModule,
    TaskQueueModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: BankAccount.name, schema: BankAccountSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [OrdersController, OrdersPublicController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
