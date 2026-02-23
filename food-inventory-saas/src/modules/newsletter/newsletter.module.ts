import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { NewsletterController } from "./newsletter.controller";
import { NewsletterService } from "./newsletter.service";
import {
  NewsletterSubscriber,
  NewsletterSubscriberSchema,
} from "../../schemas/newsletter-subscriber.schema";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NewsletterSubscriber.name, schema: NewsletterSubscriberSchema },
    ]),
    MailModule,
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
