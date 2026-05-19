import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EduAttendanceDocument = EduAttendance & Document;

@Schema()
export class AttendanceEntry {
  @Prop({ type: Types.ObjectId, ref: "EduStudent", required: true })
  studentId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: ["present", "absent", "late", "excused"],
  })
  status: string;

  @Prop({ type: String })
  notes?: string;
}
const AttendanceEntrySchema = SchemaFactory.createForClass(AttendanceEntry);

@Schema({ timestamps: true })
export class EduAttendance {
  @Prop({ type: Types.ObjectId, required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EduClassroom", required: true })
  classroomId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EduSubject" })
  subjectId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EmployeeProfile", required: true })
  teacherId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: [AttendanceEntrySchema], default: [] })
  entries: AttendanceEntry[];

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;
}

export const EduAttendanceSchema = SchemaFactory.createForClass(EduAttendance);
EduAttendanceSchema.index(
  { tenantId: 1, classroomId: 1, date: 1 },
  { unique: true },
);
EduAttendanceSchema.index({ tenantId: 1, date: 1 });
EduAttendanceSchema.index({ tenantId: 1, "entries.studentId": 1 });
