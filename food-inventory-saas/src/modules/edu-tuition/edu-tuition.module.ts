import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { EduTuitionController } from "./edu-tuition.controller";
import { EduTuitionService } from "./edu-tuition.service";
import { EduTuitionScheduler } from "./edu-tuition.scheduler";
import { TuitionPaymentListener } from "./listeners/tuition-payment.listener";
import { EduTuitionFee, EduTuitionFeeSchema } from "../../schemas/edu-tuition-fee.schema";
import { EduStudent, EduStudentSchema } from "../../schemas/edu-student.schema";
import { WhapiModule } from "../whapi/whapi.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EduTuitionFee.name, schema: EduTuitionFeeSchema },
      { name: EduStudent.name, schema: EduStudentSchema },
    ]),
    ScheduleModule.forRoot(),
    WhapiModule,
  ],
  controllers: [EduTuitionController],
  providers: [EduTuitionService, EduTuitionScheduler, TuitionPaymentListener],
  exports: [EduTuitionService],
})
export class EduTuitionModule {}
