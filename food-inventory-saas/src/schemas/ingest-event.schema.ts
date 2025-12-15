import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, collection: "ingest_events" })
export class IngestEvent {
  @Prop({ required: true })
  messageId: string;

  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true })
  source: string;
}

export type IngestEventDocument = IngestEvent & Document;
export const IngestEventSchema = SchemaFactory.createForClass(IngestEvent);
