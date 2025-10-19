import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import {
  PerformanceKpi,
  PerformanceKpiSchema,
} from "../../schemas/performance-kpi.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { Shift, ShiftSchema } from "../../schemas/shift.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { User, UserSchema } from "../../schemas/user.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import {
  Inventory,
  InventorySchema,
  InventoryMovement,
  InventoryMovementSchema,
} from "../../schemas/inventory.schema";
import { Payable, PayableSchema } from "../../schemas/payable.schema";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: PerformanceKpi.name, schema: PerformanceKpiSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: Payable.name, schema: PayableSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
