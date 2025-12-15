import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class Playbook {
  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [String], default: [] })
  triggers: string[]; // e.g., stage:Calificado, source:whatsapp

  @Prop({ type: Number, default: 0 })
  delayMinutes: number; // delay before executing steps

  @Prop({ type: String, enum: ["email", "whatsapp", "task"], default: "task" })
  actionType: "email" | "whatsapp" | "task";

  @Prop({ type: String })
  templateId?: string; // reference to email/whatsapp template

  @Prop({ type: String })
  taskTitle?: string;

  @Prop({ type: String })
  channel?: string; // email/whatsapp
}

export type PlaybookDocument = Playbook & Document;
export const PlaybookSchema = SchemaFactory.createForClass(Playbook);
