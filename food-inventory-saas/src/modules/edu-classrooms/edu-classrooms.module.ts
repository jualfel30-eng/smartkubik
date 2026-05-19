import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EduClassroomsController } from "./edu-classrooms.controller";
import { EduClassroomsService } from "./edu-classrooms.service";
import { EduClassroom, EduClassroomSchema } from "../../schemas/edu-classroom.schema";
import { EduStudent, EduStudentSchema } from "../../schemas/edu-student.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EduClassroom.name, schema: EduClassroomSchema },
      { name: EduStudent.name, schema: EduStudentSchema },
    ]),
  ],
  controllers: [EduClassroomsController],
  providers: [EduClassroomsService],
  exports: [EduClassroomsService],
})
export class EduClassroomsModule {}
