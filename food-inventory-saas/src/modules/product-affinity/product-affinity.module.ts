import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import {
  ProductAffinity,
  ProductAffinitySchema,
} from "../../schemas/product-affinity.schema";
import {
  CustomerProductAffinity,
  CustomerProductAffinitySchema,
} from "../../schemas/customer-product-affinity.schema";
import {
  CustomerTransactionHistory,
  CustomerTransactionHistorySchema,
} from "../../schemas/customer-transaction-history.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { ProductAffinityService } from "../../services/product-affinity.service";
import { ProductAffinityController } from "../../controllers/product-affinity.controller";
import { UpdateAffinityScoresJob } from "./update-affinity-scores.job";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductAffinity.name, schema: ProductAffinitySchema },
      {
        name: CustomerProductAffinity.name,
        schema: CustomerProductAffinitySchema,
      },
      {
        name: CustomerTransactionHistory.name,
        schema: CustomerTransactionHistorySchema,
      },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [ProductAffinityController],
  providers: [ProductAffinityService, UpdateAffinityScoresJob],
  exports: [ProductAffinityService],
})
export class ProductAffinityModule {}
