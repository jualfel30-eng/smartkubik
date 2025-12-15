import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { MailService } from "./mail.service";
import { GmailOAuthService } from "./gmail-oauth.service";
import { OutlookOAuthService } from "./outlook-oauth.service";
import { ResendService } from "./resend.service";
import { EmailConfigController } from "./email-config.controller";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { MailWebhookController } from "./mail.webhook.controller";
import { OpportunitiesModule } from "../opportunities/opportunities.module";

@Module({
  imports: [
    ConfigModule,
    OpportunitiesModule,
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  controllers: [EmailConfigController, MailWebhookController],
  providers: [
    MailService,
    GmailOAuthService,
    OutlookOAuthService,
    ResendService,
  ],
  exports: [MailService, GmailOAuthService, OutlookOAuthService, ResendService],
})
export class MailModule {}
