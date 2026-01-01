import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ShiftDocument = Shift & Document;

@Schema({ timestamps: true })
export class Shift {
  @Prop({ type: Types.ObjectId, ref: "EmployeeProfile", required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  userId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Date, index: true })
  clockIn?: Date;

  @Prop({ type: Date })
  clockOut?: Date;

  @Prop({ type: Number })
  durationInHours?: number;

  /**
   * Scheduling Fields
   */
  @Prop({ type: Date })
  scheduledStart?: Date;

  @Prop({ type: Date })
  scheduledEnd?: Date;

  @Prop({ type: String, enum: ['scheduled', 'adhoc'], default: 'scheduled' })
  type: string;

  @Prop({ type: String, enum: ['draft', 'published', 'in-progress', 'completed', 'missed'], default: 'draft', index: true })
  status: string;

  @Prop({ type: String })
  role?: string; // Job title required for this shift

  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  publishedBy?: Types.ObjectId;

  /**
   * Analysis Fields
   */
  @Prop({ type: Number, default: 0 })
  breakDuration: number; // in minutes

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Object })
  metadata?: {
    ipAddress?: string;
    device?: string;
  };
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);

ShiftSchema.pre("save", function (next) {
  if (this.isModified("clockOut") && this.clockOut && this.clockIn) {
    const durationInMs = this.clockOut.getTime() - this.clockIn.getTime();
    this.durationInHours = durationInMs / (1000 * 60 * 60);
  }
  next();
});
