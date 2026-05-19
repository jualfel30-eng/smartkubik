import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EduClassroomDocument = EduClassroom & Document;

@Schema({ timestamps: true })
export class EduClassroom {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  grade: string;

  @Prop({ type: String, required: true })
  section: string;

  @Prop({ type: String, required: true })
  academicYear: string;

  @Prop({ type: Number, default: 30 })
  capacity: number;

  @Prop({ type: Types.ObjectId, ref: "EmployeeProfile" })
  tutorId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: "EduStudent" }], default: [] })
  studentIds: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: "EduSubject" }], default: [] })
  subjectIds: Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;
}

export const EduClassroomSchema = SchemaFactory.createForClass(EduClassroom);
EduClassroomSchema.index(
  { tenantId: 1, academicYear: 1, grade: 1, section: 1 },
  { unique: true },
);
EduClassroomSchema.index({ tenantId: 1, tutorId: 1 });
EduClassroomSchema.index({ tenantId: 1, isDeleted: 1 });
