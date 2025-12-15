import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PromotionsService } from "./promotions.service";
import { PromotionsController } from "./promotions.controller";
import { Promotion, PromotionSchema } from "../../schemas/promotion.schema";
import {
  PromotionUsage,
  PromotionUsageSchema,
} from "../../schemas/promotion-usage.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
      { name: PromotionUsage.name, schema: PromotionUsageSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
