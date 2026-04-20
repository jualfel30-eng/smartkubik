import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { WhapiController } from "./whapi.controller";
import { WhapiService } from "./whapi.service";
import { WhapiPartnerController } from "./whapi-partner.controller";
import { WhapiPartnerService } from "./whapi-partner.service";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import {
  WhapiChannel,
  WhapiChannelSchema,
} from "../../schemas/whapi-channel.schema";
import { SuperAdminModule } from "../super-admin/super-admin.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: WhapiChannel.name, schema: WhapiChannelSchema },
    ]),
    ConfigModule,
    forwardRef(() => SuperAdminModule),
  ],
  controllers: [WhapiController, WhapiPartnerController],
  providers: [WhapiService, WhapiPartnerService],
  exports: [WhapiService, WhapiPartnerService],
})
export class WhapiModule {}
