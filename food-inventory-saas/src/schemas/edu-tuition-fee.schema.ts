import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EduTuitionFeeDocument = EduTuitionFee & Document;

@Schema({ timestamps: true })
export class EduTuitionFee {
  @Prop({ type: Types.ObjectId, required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EduStudent", required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EduClassroom", required: true })
  classroomId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: ["enrollment", "monthly", "special"],
  })
  type: string;

  @Prop({ type: String, required: true })
  academicYear: string;

  @Prop({ type: Number, min: 1, max: 12 })
  month?: number;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, default: "USD" })
  currency: string;

  @Prop({ type: Date, required: true })
  dueDate: Date;

  @Prop({
    type: String,
    default: "pending",
    enum: ["pending", "paid", "overdue", "waived"],
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: "Payment" })
  paymentId?: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  notificationsCount: number;

  @Prop({ type: Date })
  lastNotifiedAt?: Date;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;
}

export const EduTuitionFeeSchema = SchemaFactory.createForClass(EduTuitionFee);
EduTuitionFeeSchema.index(
  { tenantId: 1, studentId: 1, type: 1, month: 1, academicYear: 1 },
  { unique: true, sparse: true },
);
EduTuitionFeeSchema.index({ tenantId: 1, status: 1 });
EduTuitionFeeSchema.index({ tenantId: 1, dueDate: 1 });
EduTuitionFeeSchema.index({ tenantId: 1, classroomId: 1, status: 1 });
