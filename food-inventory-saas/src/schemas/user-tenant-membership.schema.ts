import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type UserTenantMembershipDocument = UserTenantMembership & Document;

export type MembershipStatus = "active" | "inactive" | "invited";

@Schema({ timestamps: true })
export class UserTenantMembership {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Role", required: true })
  roleId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["active", "inactive", "invited"],
    default: "active",
    required: true,
  })
  status: MembershipStatus;

  @Prop({ type: Boolean, default: false })
  isDefault: boolean;

  @Prop({ type: [String], default: [] })
  permissionsCache: string[];
}

export const UserTenantMembershipSchema =
  SchemaFactory.createForClass(UserTenantMembership);

UserTenantMembershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
UserTenantMembershipSchema.index({ tenantId: 1, status: 1 });
UserTenantMembershipSchema.index({ userId: 1, isDefault: 1 });
