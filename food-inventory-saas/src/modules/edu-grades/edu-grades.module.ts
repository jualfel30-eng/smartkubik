import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EduGradesController } from "./edu-grades.controller";
import { EduGradesService } from "./edu-grades.service";
import { GradesPublishedListener } from "./listeners/grades-published.listener";
import { EduGrade, EduGradeSchema } from "../../schemas/edu-grade.schema";
import { EduSubject, EduSubjectSchema } from "../../schemas/edu-subject.schema";
import { EduStudent, EduStudentSchema } from "../../schemas/edu-student.schema";
import { EmployeeProfile, EmployeeProfileSchema } from "../../schemas/employee-profile.schema";
import { WhapiModule } from "../whapi/whapi.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EduGrade.name, schema: EduGradeSchema },
      { name: EduSubject.name, schema: EduSubjectSchema },
      { name: EduStudent.name, schema: EduStudentSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
    ]),
    WhapiModule,
  ],
  controllers: [EduGradesController],
  providers: [EduGradesService, GradesPublishedListener],
  exports: [EduGradesService],
})
export class EduGradesModule {}
