import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EduTuitionController } from "./edu-tuition.controller";
import { EduTuitionService } from "./edu-tuition.service";
import { EduTuitionFee, EduTuitionFeeSchema } from "../../schemas/edu-tuition-fee.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EduTuitionFee.name, schema: EduTuitionFeeSchema }]),
  ],
  controllers: [EduTuitionController],
  providers: [EduTuitionService],
  exports: [EduTuitionService],
})
export class EduTuitionModule {}
