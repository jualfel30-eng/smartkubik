import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  PayrollWebhookConfig,
  PayrollWebhookConfigSchema,
} from "../../schemas/payroll-webhook-config.schema";
import { PayrollWebhooksService } from "./payroll-webhooks.service";
import { PayrollWebhooksController } from "./payroll-webhooks.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PayrollWebhookConfig.name, schema: PayrollWebhookConfigSchema },
    ]),
  ],
  controllers: [PayrollWebhooksController],
  providers: [PayrollWebhooksService],
  exports: [PayrollWebhooksService],
})
export class PayrollWebhooksModule {}
