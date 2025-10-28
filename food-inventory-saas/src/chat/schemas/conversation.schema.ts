import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, index: true })
  customerPhoneNumber: string;

  @Prop()
  customerName?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Customer" })
  customerId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: "Message" }] })
  messages: MongooseSchema.Types.ObjectId[];

  @Prop({ type: String })
  summary?: string;

  @Prop({ type: Date })
  summaryUpdatedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
