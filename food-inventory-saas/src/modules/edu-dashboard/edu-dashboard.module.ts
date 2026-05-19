import { Module } from "@nestjs/common";
import { EduDashboardController } from "./edu-dashboard.controller";
import { EduDashboardService } from "./edu-dashboard.service";

@Module({
  controllers: [EduDashboardController],
  providers: [EduDashboardService],
})
export class EduDashboardModule {}
