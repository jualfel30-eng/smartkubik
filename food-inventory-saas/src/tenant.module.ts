import { Module } from "@nestjs/common";
import { TenantController } from "./tenant.controller";
import { TenantService } from "./tenant.service";
import { SharedModule } from "./common/shared.module";
import { MailModule } from "./modules/mail/mail.module";

@Module({
  imports: [SharedModule, MailModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [],
})
export class TenantModule {}
