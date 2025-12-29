import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { MailModule } from "../mail/mail.module";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import {
  GlobalSetting,
  GlobalSettingSchema,
} from "../../schemas/global-settings.schema";
import { NotificationsService } from "./notifications.service";
import { NotificationTemplateLoader } from "./templates/notification-template.loader";
import { CustomersModule } from "../customers/customers.module";

import { NotificationsListener } from "./notifications.listener";

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => MailModule),
    forwardRef(() => CustomersModule),
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: GlobalSetting.name, schema: GlobalSettingSchema },
    ]),
  ],
  providers: [NotificationsService, NotificationTemplateLoader, NotificationsListener],
  exports: [NotificationsService],
})
export class NotificationsModule { }
