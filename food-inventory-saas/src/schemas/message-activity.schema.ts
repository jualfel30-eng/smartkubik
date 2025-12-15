import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class MessageActivity {
  @Prop({ type: Types.ObjectId, ref: "Opportunity", required: true })
  opportunityId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  customerId: Types.ObjectId;

  @Prop({ type: String, required: true })
  channel: string;

  @Prop({ type: String })
  messageId?: string;

  @Prop({ type: String })
  threadId?: string;

  @Prop({ type: String })
  direction: "inbound" | "outbound";

  @Prop({ type: String })
  subject?: string;

  @Prop({ type: [String], default: [] })
  to?: string[];

  @Prop({ type: String })
  from?: string;

  @Prop({ type: String })
  body?: string;

  @Prop({ type: String, default: "message" })
  kind?: "message" | "email" | "meeting";

  @Prop({ type: Date })
  startAt?: Date;

  @Prop({ type: Date })
  endAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: String, required: true })
  tenantId: string;
}

export type MessageActivityDocument = MessageActivity & Document;
export const MessageActivitySchema = SchemaFactory.createForClass(MessageActivity);
