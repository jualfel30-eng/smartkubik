import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
