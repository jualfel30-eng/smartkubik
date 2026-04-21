import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { IntelligenceService } from "./intelligence.service";
import { IntelligenceSchedulerService } from "./intelligence-scheduler.service";
import { ProactiveNotifierService } from "./proactive-notifier.service";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { Inventory, InventorySchema } from "../../schemas/inventory.schema";
import { Supplier, SupplierSchema } from "../../schemas/supplier.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import {
  TenantMetrics,
  TenantMetricsSchema,
} from "../../schemas/tenant-metrics.schema";
import {
  TenantEventLog,
  TenantEventLogSchema,
} from "../../schemas/tenant-event-log.schema";
import { WhapiModule } from "../whapi/whapi.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: TenantMetrics.name, schema: TenantMetricsSchema },
      { name: TenantEventLog.name, schema: TenantEventLogSchema },
    ]),
    WhapiModule,
  ],
  providers: [
    IntelligenceService,
    IntelligenceSchedulerService,
    ProactiveNotifierService,
  ],
  exports: [IntelligenceService, ProactiveNotifierService],
})
export class IntelligenceModule {}
