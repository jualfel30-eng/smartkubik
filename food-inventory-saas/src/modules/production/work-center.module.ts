import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { WorkCenterController } from "./work-center.controller";
import { WorkCenterService } from "./work-center.service";
import { WorkCenter, WorkCenterSchema } from "../../schemas/work-center.schema";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkCenter.name, schema: WorkCenterSchema },
    ]),
    AuthModule,
  ],
  controllers: [WorkCenterController],
  providers: [WorkCenterService],
  exports: [WorkCenterService],
})
export class WorkCenterModule {}
