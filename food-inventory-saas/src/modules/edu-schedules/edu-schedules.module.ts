import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EduSchedulesController } from "./edu-schedules.controller";
import { EduSchedulesService } from "./edu-schedules.service";
import { EduSchedule, EduScheduleSchema } from "../../schemas/edu-schedule.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EduSchedule.name, schema: EduScheduleSchema }]),
  ],
  controllers: [EduSchedulesController],
  providers: [EduSchedulesService],
  exports: [EduSchedulesService],
})
export class EduSchedulesModule {}
