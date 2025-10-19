import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type OrganizationDocument = Organization & Document;

@Schema({ timestamps: true })
export class Organization {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: String, required: false })
  address?: string;

  @Prop({ type: String, required: false })
  phone?: string;

  @Prop({ type: String, required: false })
  email?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  owner: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Organization", required: false })
  parentOrganization?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["new-business", "new-location"],
    default: "new-business",
  })
  type?: string;

  @Prop({
    type: String,
    enum: ["FOOD_SERVICE", "RETAIL", "SERVICES", "LOGISTICS", "HYBRID"],
    required: false,
  })
  vertical?: string;

  @Prop({ type: String, required: false })
  businessType?: string;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["admin", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  members: Array<{
    userId: Types.ObjectId;
    role: "admin" | "member";
    joinedAt: Date;
  }>;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
