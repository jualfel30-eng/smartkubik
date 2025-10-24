import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { MembershipSummary } from "../modules/memberships/memberships.service";

export type SessionDocument = Session & Document;

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: false })
  tenantId?: Types.ObjectId | null;

  @Prop({ type: String, required: false })
  membershipId?: string | null;

  @Prop({ type: Types.ObjectId, ref: "Role", required: false })
  roleId?: Types.ObjectId | null;

  @Prop({ type: Boolean, default: false })
  impersonation?: boolean;

  @Prop({ type: Types.ObjectId, ref: "User", required: false })
  impersonatorId?: Types.ObjectId | null;

  @Prop({ type: String, required: true })
  refreshTokenHash: string;

  @Prop({ type: String, required: false })
  previousTokenHash?: string | null;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Boolean, default: false })
  revoked: boolean;

  @Prop({ type: Date, required: false })
  revokedAt?: Date | null;

  @Prop({ type: String, required: false })
  revokedReason?: string | null;

  @Prop({ type: Date, required: false })
  lastUsedAt?: Date | null;

  @Prop({ type: Date, required: false })
  rotatedAt?: Date | null;

  @Prop({ type: String, required: false, maxlength: 512 })
  userAgent?: string | null;

  @Prop({ type: String, required: false, maxlength: 64 })
  ipAddress?: string | null;

  @Prop({ type: Object, required: false })
  membershipSnapshot?: MembershipSummary | null;

  @Prop({ type: [Object], required: false, default: undefined })
  membershipsSnapshot?: MembershipSummary[] | null;

  @Prop({ type: Date, required: false })
  membershipSnapshotExpiresAt?: Date | null;

  @Prop({ type: String, required: false })
  membershipSnapshotMembershipId?: string | null;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ userId: 1, revoked: 1 });
SessionSchema.index({ tenantId: 1, revoked: 1 });
