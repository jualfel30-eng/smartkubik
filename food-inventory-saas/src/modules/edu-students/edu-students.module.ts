import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EduStudentsController } from "./edu-students.controller";
import { EduStudentsService } from "./edu-students.service";
import { EduAuthController } from "./edu-auth.controller";
import { EduAuthService } from "./edu-auth.service";
import { EduStudent, EduStudentSchema } from "../../schemas/edu-student.schema";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EduStudent.name, schema: EduStudentSchema }]),
    forwardRef(() => AuthModule),
  ],
  controllers: [EduStudentsController, EduAuthController],
  providers: [EduStudentsService, EduAuthService],
  exports: [EduStudentsService],
})
export class EduStudentsModule {}
