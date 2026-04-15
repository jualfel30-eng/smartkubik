import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import {
  Notification,
  NotificationSchema,
} from "../../schemas/notification.schema";
import { User, UserSchema } from "../../schemas/user.schema";
import { NotificationCenterService } from "./notification-center.service";
import { NotificationCenterController } from "./notification-center.controller";
import { NotificationCenterGateway } from "./notification-center.gateway";
import { NotificationCenterListener } from "./notification-center.listener";
import { WebPushService } from "./web-push.service";

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [NotificationCenterController],
  providers: [
    NotificationCenterService,
    NotificationCenterGateway,
    NotificationCenterListener,
    WebPushService,
  ],
  exports: [NotificationCenterService, NotificationCenterGateway, WebPushService],
})
export class NotificationCenterModule {}
