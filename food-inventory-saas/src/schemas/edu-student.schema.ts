import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EduStudentDocument = EduStudent & Document;

@Schema()
export class EduStudentGuardian {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  whatsapp?: string;

  @Prop({ type: String })
  email?: string;
}
const EduStudentGuardianSchema = SchemaFactory.createForClass(EduStudentGuardian);

@Schema({ timestamps: true })
export class EduStudent {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, required: true })
  enrollmentNumber: string;

  @Prop({ type: Date, required: true })
  enrollmentDate: Date;

  @Prop({
    type: String,
    enum: ["enrolled", "active", "graduated", "withdrawn", "suspended"],
    default: "enrolled",
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: "EduClassroom" })
  classroomId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  academicYear: string;

  @Prop({ type: Types.ObjectId, ref: "Customer" })
  guardianCustomerId?: Types.ObjectId;

  @Prop({ type: EduStudentGuardianSchema, required: true })
  guardian: EduStudentGuardian;

  @Prop({ type: String })
  medicalNotes?: string;

  @Prop({ type: String, enum: ["full", "partial"] })
  scholarshipType?: string;

  @Prop({ type: Number, min: 0, max: 100 })
  scholarshipPct?: number;

  @Prop({ type: String })
  photo?: string;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EduStudentSchema = SchemaFactory.createForClass(EduStudent);

EduStudentSchema.index({ tenantId: 1, email: 1 }, { unique: true });
EduStudentSchema.index({ tenantId: 1, enrollmentNumber: 1 }, { unique: true });
EduStudentSchema.index({ tenantId: 1, classroomId: 1 });
EduStudentSchema.index({ tenantId: 1, status: 1 });
EduStudentSchema.index({ tenantId: 1, isDeleted: 1 });
