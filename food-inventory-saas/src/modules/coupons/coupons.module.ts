import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CouponsService } from "./coupons.service";
import { CouponsController } from "./coupons.controller";
import { Coupon, CouponSchema } from "../../schemas/coupon.schema";
import {
  CouponUsage,
  CouponUsageSchema,
} from "../../schemas/coupon-usage.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Coupon.name, schema: CouponSchema },
      { name: CouponUsage.name, schema: CouponUsageSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
