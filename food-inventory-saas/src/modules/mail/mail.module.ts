import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { MailService } from "./mail.service";
import { GmailOAuthService } from "./gmail-oauth.service";
import { OutlookOAuthService } from "./outlook-oauth.service";
import { ResendService } from "./resend.service";
import { EmailConfigController } from "./email-config.controller";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { MailWebhookController } from "./mail.webhook.controller";
import { OpportunitiesModule } from "../opportunities/opportunities.module";
import { CalendarWatchRenewalJob } from "./calendar-watch-renewal.job";

@Module({
  imports: [
    ConfigModule,
    OpportunitiesModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  controllers: [EmailConfigController, MailWebhookController],
  providers: [
    MailService,
    GmailOAuthService,
    OutlookOAuthService,
    ResendService,
    CalendarWatchRenewalJob,
  ],
  exports: [
    MailService,
    GmailOAuthService,
    OutlookOAuthService,
    ResendService,
    CalendarWatchRenewalJob,
  ],
})
export class MailModule {}
