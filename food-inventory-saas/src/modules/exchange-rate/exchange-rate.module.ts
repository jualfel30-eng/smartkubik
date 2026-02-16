import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ExchangeRateController } from "./exchange-rate.controller";
import { ExchangeRateService } from "./exchange-rate.service";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  controllers: [ExchangeRateController],
  providers: [ExchangeRateService],
  exports: [ExchangeRateService],
})
export class ExchangeRateModule {}
