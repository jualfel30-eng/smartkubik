import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { LoyaltyService } from "./loyalty.service";
import { LoyaltyController } from "./loyalty.controller";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import {
  ServicePackage,
  ServicePackageSchema,
} from "../../schemas/service-package.schema";
import {
  LoyaltyTransaction,
  LoyaltyTransactionSchema,
} from "../../schemas/loyalty-transaction.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: ServicePackage.name, schema: ServicePackageSchema },
      { name: LoyaltyTransaction.name, schema: LoyaltyTransactionSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
