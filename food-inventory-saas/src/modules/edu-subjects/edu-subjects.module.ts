import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EduSubjectsController } from "./edu-subjects.controller";
import { EduSubjectsService } from "./edu-subjects.service";
import { EduSubject, EduSubjectSchema } from "../../schemas/edu-subject.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EduSubject.name, schema: EduSubjectSchema }]),
  ],
  controllers: [EduSubjectsController],
  providers: [EduSubjectsService],
  exports: [EduSubjectsService],
})
export class EduSubjectsModule {}
