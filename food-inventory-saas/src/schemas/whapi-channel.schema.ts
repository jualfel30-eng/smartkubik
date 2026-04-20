import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { safeEncrypt } from "../utils/encryption.util";

export type WhapiChannelDocument = WhapiChannel & Document;

@Schema({ timestamps: true })
export class WhapiChannel {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  channelId: string; // Whapi channel ID (e.g. "SHAZAM-3HDYQ")

  @Prop({ type: String, required: true })
  token: string; // Encrypted channel API token (for gate.whapi.cloud)

  @Prop({ type: String })
  name: string; // Channel display name

  @Prop({ type: String })
  phoneNumber?: string; // Linked WhatsApp phone number (set after QR scan)

  @Prop({
    type: String,
    enum: ["pending", "awaiting_scan", "connected", "disconnected", "expired"],
    default: "pending",
  })
  status: string;

  @Prop({
    type: String,
    enum: ["trial", "sandbox", "live"],
    default: "trial",
  })
  mode: string;

  @Prop({ type: Date })
  activeTill?: Date; // Channel expiration date

  @Prop({ type: String })
  webhookUrl?: string; // Configured webhook URL for this channel

  @Prop({ type: Boolean, default: false })
  webhookConfigured: boolean;

  @Prop({ type: Date })
  connectedAt?: Date; // When WhatsApp was linked

  @Prop({ type: Date })
  lastHealthCheck?: Date;

  @Prop({ type: String })
  projectId?: string; // Whapi project grouping

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export const WhapiChannelSchema = SchemaFactory.createForClass(WhapiChannel);

// Pre-save hook: encrypt token
WhapiChannelSchema.pre("save", function (next) {
  if (this.isModified("token") && this.token) {
    this.token = safeEncrypt(this.token);
  }
  next();
});

// Index for fast lookups
WhapiChannelSchema.index({ tenantId: 1, isDeleted: 1 });
WhapiChannelSchema.index({ channelId: 1 });
