import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EduAttendanceController } from "./edu-attendance.controller";
import { EduAttendanceService } from "./edu-attendance.service";
import { EduAbsenceListener } from "./listeners/edu-absence.listener";
import { EduAttendance, EduAttendanceSchema } from "../../schemas/edu-attendance.schema";
import { EduStudent, EduStudentSchema } from "../../schemas/edu-student.schema";
import { EduClassroom, EduClassroomSchema } from "../../schemas/edu-classroom.schema";
import { WhapiModule } from "../whapi/whapi.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EduAttendance.name, schema: EduAttendanceSchema },
      { name: EduStudent.name, schema: EduStudentSchema },
      { name: EduClassroom.name, schema: EduClassroomSchema },
    ]),
    WhapiModule,
  ],
  controllers: [EduAttendanceController],
  providers: [EduAttendanceService, EduAbsenceListener],
  exports: [EduAttendanceService],
})
export class EduAttendanceModule {}
