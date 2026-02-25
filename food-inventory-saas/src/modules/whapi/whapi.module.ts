import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { WhapiController } from "./whapi.controller";
import { WhapiService } from "./whapi.service";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { SuperAdminModule } from "../super-admin/super-admin.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    ConfigModule,
    forwardRef(() => SuperAdminModule),
  ],
  controllers: [WhapiController],
  providers: [WhapiService],
  exports: [WhapiService],
})
export class WhapiModule { }
