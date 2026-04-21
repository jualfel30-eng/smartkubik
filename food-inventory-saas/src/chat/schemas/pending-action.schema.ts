import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

export type PendingActionDocument = PendingAction & Document;

export type PendingActionStatus = "pending" | "confirmed" | "cancelled" | "expired";

@Schema({ timestamps: true })
export class PendingAction {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  conversationId: string;

  @Prop({ required: true })
  actionType: string; // 'create_supplier', 'create_product', 'add_inventory', etc.

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  payload: Record<string, any>;

  @Prop({ required: true })
  summary: string; // Human-readable summary for WhatsApp message

  @Prop({ type: String })
  userId?: string; // The user who initiated the action

  @Prop({
    type: String,
    enum: ["pending", "confirmed", "cancelled", "expired"],
    default: "pending",
    required: true,
  })
  status: PendingActionStatus;

  @Prop({
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes TTL
    index: { expires: 0 }, // MongoDB TTL index — auto-deletes after expiresAt
  })
  expiresAt: Date;
}

export const PendingActionSchema = SchemaFactory.createForClass(PendingAction);

// Index for fast lookups
PendingActionSchema.index({ tenantId: 1, status: 1 });
