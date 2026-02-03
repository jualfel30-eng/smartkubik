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
import {
  Appointment,
  AppointmentSchema,
} from "../../schemas/appointment.schema";
import { Service, ServiceSchema } from "../../schemas/service.schema";
import { Resource, ResourceSchema } from "../../schemas/resource.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import {
  ChartOfAccounts,
  ChartOfAccountsSchema,
} from "../../schemas/chart-of-accounts.schema";
import {
  JournalEntry,
  JournalEntrySchema,
} from "../../schemas/journal-entry.schema";
import {
  PayrollRun,
  PayrollRunSchema,
} from "../../schemas/payroll-run.schema";
import {
  FixedAsset,
  FixedAssetSchema,
} from "../../schemas/fixed-asset.schema";
import {
  Investment,
  InvestmentSchema,
} from "../../schemas/investment.schema";
import { Payment, PaymentSchema } from "../../schemas/payment.schema";
import { MenuEngineeringModule } from "../menu-engineering/menu-engineering.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MenuEngineeringModule,
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
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Resource.name, schema: ResourceSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: ChartOfAccounts.name, schema: ChartOfAccountsSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: PayrollRun.name, schema: PayrollRunSchema },
      { name: FixedAsset.name, schema: FixedAssetSchema },
      { name: Investment.name, schema: InvestmentSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule { }
