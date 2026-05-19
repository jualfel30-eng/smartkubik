import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EduSubjectDocument = EduSubject & Document;

@Schema()
export class EduGradeScale {
  @Prop({ type: Number, default: 1 })
  min: number;

  @Prop({ type: Number, default: 20 })
  max: number;

  @Prop({ type: Number, default: 10 })
  passing: number;
}
const EduGradeScaleSchema = SchemaFactory.createForClass(EduGradeScale);

@Schema({ timestamps: true })
export class EduSubject {
  @Prop({ type: Types.ObjectId, required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EduClassroom", required: true })
  classroomId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EmployeeProfile", required: true })
  teacherId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  code?: string;

  @Prop({ type: Number, default: 4 })
  periodsPerWeek: number;

  @Prop({ type: EduGradeScaleSchema, default: () => ({}) })
  gradeScale: EduGradeScale;

  @Prop({ type: String, required: true })
  academicYear: string;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;
}

export const EduSubjectSchema = SchemaFactory.createForClass(EduSubject);
EduSubjectSchema.index(
  { tenantId: 1, classroomId: 1, name: 1, academicYear: 1 },
  { unique: true },
);
EduSubjectSchema.index({ tenantId: 1, teacherId: 1 });
EduSubjectSchema.index({ tenantId: 1, classroomId: 1 });
