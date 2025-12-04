import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { MailService } from "./mail.service";
import { GmailOAuthService } from "./gmail-oauth.service";
import { OutlookOAuthService } from "./outlook-oauth.service";
import { ResendService } from "./resend.service";
import { EmailConfigController } from "./email-config.controller";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  controllers: [EmailConfigController],
  providers: [
    MailService,
    GmailOAuthService,
    OutlookOAuthService,
    ResendService,
  ],
  exports: [MailService, GmailOAuthService, OutlookOAuthService, ResendService],
})
export class MailModule {}
