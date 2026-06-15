import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { Order, OrderSchema } from "../../schemas/order.schema";
import {
  BeautyBooking,
  BeautyBookingSchema,
} from "../../schemas/beauty-booking.schema";
import {
  BeautyService,
  BeautyServiceSchema,
} from "../../schemas/beauty-service.schema";
import {
  StorefrontConfig,
  StorefrontConfigSchema,
} from "../../schemas/storefront-config.schema";
import { AccountingModule } from "../accounting/accounting.module";
import { ExchangeRateModule } from "../exchange-rate/exchange-rate.module";
import {
  Notification,
  NotificationSchema,
} from "../../schemas/notification.schema";
import {
  TenantPaymentConfig,
  TenantPaymentConfigSchema,
} from "../../schemas/tenant-payment-config.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { User, UserSchema } from "../../schemas/user.schema";
import { MarketingModule } from "../marketing/marketing.module";
import { NotificationCenterModule } from "../notification-center/notification-center.module";
import { PaymentsModule } from "../payments/payments.module";
import { PaymentRequestsController } from "./controllers/payment-requests.controller";
import { PaymentPortalController } from "./controllers/public/payment-portal.controller";
import { PaymentRequestOrderCreatedListener } from "./listeners/order-created.listener";
import { ExpireStalePaymentRequestsJob } from "./jobs/expire-stale-requests.job";
import {
  PaymentRequest,
  PaymentRequestSchema,
} from "./schemas/payment-request.schema";
import { ImageOptimizerService } from "./services/image-optimizer.service";
import { PaymentRequestNotificationsService } from "./services/payment-request-notifications.service";
import { PaymentRequestsService } from "./services/payment-requests.service";
import { PaymentTokenService } from "./services/payment-token.service";
import {
  LocalDiskPaymentProofStorageAdapter,
  PAYMENT_PROOF_STORAGE,
} from "./services/payment-proof-storage.service";
import { PaymentTokenGuard } from "./guards/payment-token.guard";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: PaymentRequest.name, schema: PaymentRequestSchema },
      { name: Order.name, schema: OrderSchema },
      { name: TenantPaymentConfig.name, schema: TenantPaymentConfigSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: BeautyBooking.name, schema: BeautyBookingSchema },
      { name: BeautyService.name, schema: BeautyServiceSchema },
      { name: StorefrontConfig.name, schema: StorefrontConfigSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
      }),
      inject: [ConfigService],
    }),
    PaymentsModule,
    AccountingModule,
    ExchangeRateModule,
    MarketingModule,
    NotificationCenterModule,
  ],
  controllers: [PaymentRequestsController, PaymentPortalController],
  providers: [
    PaymentRequestsService,
    PaymentTokenService,
    PaymentRequestNotificationsService,
    ImageOptimizerService,
    LocalDiskPaymentProofStorageAdapter,
    {
      provide: PAYMENT_PROOF_STORAGE,
      useExisting: LocalDiskPaymentProofStorageAdapter,
    },
    PaymentTokenGuard,
    PaymentRequestOrderCreatedListener,
    ExpireStalePaymentRequestsJob,
  ],
  exports: [
    PaymentRequestsService,
    PaymentTokenService,
    PaymentTokenGuard,
  ],
})
export class PaymentRequestsModule {}
