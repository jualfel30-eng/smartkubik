import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import { AuthModule } from "../../auth/auth.module";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    AuthModule,
    RolesModule,
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
