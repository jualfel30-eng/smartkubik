import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SecurityMonitoringService } from "./security-monitoring.service";
import { SecurityMonitoringController } from "./security-monitoring.controller";
import { AuditLog, AuditLogSchema } from "../../schemas/audit-log.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [SecurityMonitoringController],
  providers: [SecurityMonitoringService],
  exports: [SecurityMonitoringService],
})
export class SecurityMonitoringModule {}
