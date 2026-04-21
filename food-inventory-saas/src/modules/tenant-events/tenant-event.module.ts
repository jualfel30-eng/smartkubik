import { Module, Global } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TenantEventService } from "./tenant-event.service";
import {
  TenantEventLog,
  TenantEventLogSchema,
} from "../../schemas/tenant-event-log.schema";
import {
  TenantMetrics,
  TenantMetricsSchema,
} from "../../schemas/tenant-metrics.schema";

@Global() // Global so any module can inject TenantEventService without importing
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TenantEventLog.name, schema: TenantEventLogSchema },
      { name: TenantMetrics.name, schema: TenantMetricsSchema },
    ]),
  ],
  providers: [TenantEventService],
  exports: [TenantEventService],
})
export class TenantEventModule {}
