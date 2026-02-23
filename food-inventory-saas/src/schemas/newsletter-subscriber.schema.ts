import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type NewsletterSubscriberDocument = NewsletterSubscriber & Document;

@Schema({ timestamps: true })
export class NewsletterSubscriber {
  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, default: null })
  source: string; // 'blog_sidebar', 'blog_post', 'landing', etc.

  @Prop({ type: Object, default: {} })
  utmParams: Record<string, string>;

  @Prop({ type: Boolean, default: true })
  active: boolean;
}

export const NewsletterSubscriberSchema =
  SchemaFactory.createForClass(NewsletterSubscriber);

NewsletterSubscriberSchema.index({ email: 1 }, { unique: true });
