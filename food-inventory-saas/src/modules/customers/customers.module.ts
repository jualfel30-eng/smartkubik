import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import { AuthModule } from "../../auth/auth.module";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from "../../schemas/purchase-order.schema";
import {
  PurchaseOrderRating,
  PurchaseOrderRatingSchema,
} from "../../schemas/purchase-order-rating.schema";
import { RolesModule } from "../roles/roles.module";

@Module({
  imports: [
    AuthModule,
    RolesModule,
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Order.name, schema: OrderSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: PurchaseOrderRating.name, schema: PurchaseOrderRatingSchema },
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
