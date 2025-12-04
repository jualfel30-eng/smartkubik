import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { WhapiController } from "./whapi.controller";
import { WhapiService } from "./whapi.service";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    ConfigModule,
  ],
  controllers: [WhapiController],
  providers: [WhapiService],
  exports: [WhapiService],
})
export class WhapiModule {}
