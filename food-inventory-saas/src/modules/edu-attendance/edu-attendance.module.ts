import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EduAttendanceController } from "./edu-attendance.controller";
import { EduAttendanceService } from "./edu-attendance.service";
import { EduAttendance, EduAttendanceSchema } from "../../schemas/edu-attendance.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EduAttendance.name, schema: EduAttendanceSchema }]),
  ],
  controllers: [EduAttendanceController],
  providers: [EduAttendanceService],
  exports: [EduAttendanceService],
})
export class EduAttendanceModule {}
