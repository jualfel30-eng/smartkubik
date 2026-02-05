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
    MongooseModule.forFeature([
      { name: 'PurchaseOrder', schema: require('../../schemas/purchase-order.schema').PurchaseOrderSchema },
      { name: 'Customer', schema: require('../../schemas/customer.schema').CustomerSchema },
      { name: 'Supplier', schema: require('../../schemas/supplier.schema').SupplierSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule { }
