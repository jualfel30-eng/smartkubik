import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RatingsController } from "./ratings.controller";
import { RatingsService } from "./ratings.service";
import {
  PurchaseOrderRating,
  PurchaseOrderRatingSchema,
} from "../../schemas/purchase-order-rating.schema";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseOrderRating.name, schema: PurchaseOrderRatingSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
