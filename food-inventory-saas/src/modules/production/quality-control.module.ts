import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { QualityControlController } from "./quality-control.controller";
import { QualityControlService } from "./quality-control.service";
import {
  QualityControlPlan,
  QualityControlPlanSchema,
} from "../../schemas/quality-control-plan.schema";
import {
  QualityInspection,
  QualityInspectionSchema,
  NonConformance,
  NonConformanceSchema,
} from "../../schemas/quality-inspection.schema";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QualityControlPlan.name, schema: QualityControlPlanSchema },
      { name: QualityInspection.name, schema: QualityInspectionSchema },
      { name: NonConformance.name, schema: NonConformanceSchema },
    ]),
    AuthModule,
  ],
  controllers: [QualityControlController],
  providers: [QualityControlService],
  exports: [QualityControlService],
})
export class QualityControlModule {}
