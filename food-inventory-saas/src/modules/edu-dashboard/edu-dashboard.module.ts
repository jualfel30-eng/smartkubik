import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EduDashboardController } from "./edu-dashboard.controller";
import { EduDashboardService } from "./edu-dashboard.service";
import { EduStudent, EduStudentSchema } from "../../schemas/edu-student.schema";
import { EduClassroom, EduClassroomSchema } from "../../schemas/edu-classroom.schema";
import { EduTuitionFee, EduTuitionFeeSchema } from "../../schemas/edu-tuition-fee.schema";
import { EduGrade, EduGradeSchema } from "../../schemas/edu-grade.schema";
import { EduAttendance, EduAttendanceSchema } from "../../schemas/edu-attendance.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EduStudent.name, schema: EduStudentSchema },
      { name: EduClassroom.name, schema: EduClassroomSchema },
      { name: EduTuitionFee.name, schema: EduTuitionFeeSchema },
      { name: EduGrade.name, schema: EduGradeSchema },
      { name: EduAttendance.name, schema: EduAttendanceSchema },
    ]),
  ],
  controllers: [EduDashboardController],
  providers: [EduDashboardService],
})
export class EduDashboardModule {}
