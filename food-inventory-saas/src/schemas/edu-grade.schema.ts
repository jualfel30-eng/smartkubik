import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EduGradeDocument = EduGrade & Document;

@Schema({ timestamps: true })
export class EduGrade {
  @Prop({ type: Types.ObjectId, required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EduStudent", required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EduSubject", required: true })
  subjectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EduClassroom", required: true })
  classroomId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EmployeeProfile", required: true })
  teacherId: Types.ObjectId;

  @Prop({ type: String, required: true })
  period: string;

  @Prop({ type: String, required: true })
  academicYear: string;

  @Prop({ type: Number, required: true })
  score: number;

  @Prop({ type: Number, required: true })
  maxScore: number;

  @Prop({ type: Boolean, required: true })
  isPassing: boolean;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Boolean, default: false })
  isPublished: boolean;

  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  publishedBy?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;
}

export const EduGradeSchema = SchemaFactory.createForClass(EduGrade);
EduGradeSchema.index(
  { tenantId: 1, studentId: 1, subjectId: 1, period: 1, academicYear: 1 },
  { unique: true },
);
EduGradeSchema.index({ tenantId: 1, classroomId: 1, period: 1 });
EduGradeSchema.index({ tenantId: 1, teacherId: 1, subjectId: 1 });
EduGradeSchema.index({ tenantId: 1, isPublished: 1 });
