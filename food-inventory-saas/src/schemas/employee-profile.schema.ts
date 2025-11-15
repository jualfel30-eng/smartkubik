import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type EmployeeProfileDocument = EmployeeProfile & Document;

@Schema({ timestamps: true })
export class EmployeeProfile {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  userId?: Types.ObjectId;

  @Prop({ type: String, index: true })
  employeeNumber?: string;

  @Prop({ type: String })
  position?: string;

  @Prop({ type: String })
  department?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: String })
  supervisorId?: string;

  @Prop({ type: Date })
  hireDate?: Date;

  @Prop({ type: Date })
  probationEndDate?: Date;

  @Prop({ type: Date })
  terminationDate?: Date;

  @Prop({
    type: String,
    enum: ["draft", "active", "onboarding", "suspended", "terminated"],
    default: "draft",
    index: true,
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: "EmployeeContract" })
  currentContractId?: Types.ObjectId;

  @Prop({
    type: {
      name: String,
      relationship: String,
      phone: String,
      email: String,
    },
  })
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  };

  @Prop({
    type: [
      {
        type: String,
        label: String,
        url: String,
        uploadedAt: Date,
      },
    ],
    default: [],
  })
  documents?: Array<{
    type?: string;
    label?: string;
    url?: string;
    uploadedAt?: Date;
  }>;

  @Prop({ type: String })
  workLocation?: string;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Object })
  customFields?: Record<string, any>;
}

export const EmployeeProfileSchema =
  SchemaFactory.createForClass(EmployeeProfile);

EmployeeProfileSchema.index(
  { tenantId: 1, employeeNumber: 1 },
  { unique: true, sparse: true },
);
