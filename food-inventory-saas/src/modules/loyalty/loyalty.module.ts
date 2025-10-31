import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { LoyaltyService } from "./loyalty.service";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import {
  ServicePackage,
  ServicePackageSchema,
} from "../../schemas/service-package.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: ServicePackage.name, schema: ServicePackageSchema },
    ]),
  ],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
