import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { AuthModule } from "../../auth/auth.module";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Inventory, InventorySchema } from "../../schemas/inventory.schema";
import { RolesModule } from '../roles/roles.module';
import { InventoryModule } from "../inventory/inventory.module";

@Module({
  imports: [
    AuthModule,
    RolesModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Inventory.name, schema: InventorySchema },
    ]),
    InventoryModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
