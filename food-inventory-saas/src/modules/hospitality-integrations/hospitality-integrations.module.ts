import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { MongooseModule } from "@nestjs/mongoose";
import { HospitalityIntegrationsController } from "./hospitality-integrations.controller";
import { PmsIntegrationService } from "./pms-integration.service";
import { CalendarIntegrationService } from "./calendar-integration.service";
import { HospitalityPmsSyncProcessor } from "./processors/hospitality-pms-sync.processor";
import { AppointmentsModule } from "../appointments/appointments.module";
import { CustomersModule } from "../customers/customers.module";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { HOSPITALITY_PMS_SYNC_QUEUE } from "./constants";

@Module({
  imports: [
    BullModule.registerQueue({
      name: HOSPITALITY_PMS_SYNC_QUEUE,
    }),
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
    forwardRef(() => AppointmentsModule),
    CustomersModule,
  ],
  controllers: [HospitalityIntegrationsController],
  providers: [
    PmsIntegrationService,
    CalendarIntegrationService,
    HospitalityPmsSyncProcessor,
  ],
  exports: [PmsIntegrationService, CalendarIntegrationService],
})
export class HospitalityIntegrationsModule {}
