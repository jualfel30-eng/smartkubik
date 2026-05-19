import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EduScheduleDocument = EduSchedule & Document;

@Schema({ timestamps: true })
export class EduSchedule {
  @Prop({ type: Types.ObjectId, required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EduClassroom", required: true })
  classroomId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EduSubject", required: true })
  subjectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EmployeeProfile", required: true })
  teacherId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  dayOfWeek: number;

  @Prop({ type: String, required: true })
  startTime: string;

  @Prop({ type: String, required: true })
  endTime: string;

  @Prop({ type: String, required: true })
  academicYear: string;

  @Prop({ type: Date, required: true })
  effectiveFrom: Date;

  @Prop({ type: Date })
  effectiveUntil?: Date;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;
}

export const EduScheduleSchema = SchemaFactory.createForClass(EduSchedule);
EduScheduleSchema.index({ tenantId: 1, classroomId: 1, dayOfWeek: 1 });
EduScheduleSchema.index({ tenantId: 1, teacherId: 1, dayOfWeek: 1 });
EduScheduleSchema.index({ tenantId: 1, academicYear: 1 });
