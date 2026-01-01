import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TenantPaymentConfigController } from "./tenant-payment-config.controller";
import { TenantPaymentConfigPublicController } from "./tenant-payment-config-public.controller";
import { TenantPaymentConfigService } from "./tenant-payment-config.service";
import {
  TenantPaymentConfig,
  TenantPaymentConfigSchema,
} from "../../schemas/tenant-payment-config.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TenantPaymentConfig.name, schema: TenantPaymentConfigSchema },
    ]),
  ],
  controllers: [
    TenantPaymentConfigController,
    TenantPaymentConfigPublicController,
  ],
  providers: [TenantPaymentConfigService],
  exports: [TenantPaymentConfigService],
})
export class TenantPaymentConfigModule {}
