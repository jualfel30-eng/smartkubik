import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EduGradesController } from "./edu-grades.controller";
import { EduGradesService } from "./edu-grades.service";
import { EduGrade, EduGradeSchema } from "../../schemas/edu-grade.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EduGrade.name, schema: EduGradeSchema }]),
  ],
  controllers: [EduGradesController],
  providers: [EduGradesService],
  exports: [EduGradesService],
})
export class EduGradesModule {}
