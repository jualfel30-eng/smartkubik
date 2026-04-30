import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { SystemMapService } from "./system-map.service";

@Module({
  controllers: [HealthController],
  providers: [SystemMapService],
  exports: [SystemMapService],
})
export class HealthModule {}
