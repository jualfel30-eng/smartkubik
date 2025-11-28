import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  ProductCampaign,
  ProductCampaignSchema,
} from "../../schemas/product-campaign.schema";
import { ProductCampaignService } from "../../services/product-campaign.service";
import { ProductCampaignController } from "../../controllers/product-campaign.controller";
import { CampaignAnalyticsService } from "../../services/campaign-analytics.service";
import { ProductAffinityModule } from "../product-affinity/product-affinity.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CustomersModule } from "../customers/customers.module";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import {
  CampaignAnalytics,
  CampaignAnalyticsSchema,
} from "../../schemas/campaign-analytics.schema";
import {
  CustomerProductAffinity,
  CustomerProductAffinitySchema,
} from "../../schemas/customer-product-affinity.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductCampaign.name, schema: ProductCampaignSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Order.name, schema: OrderSchema },
      { name: CampaignAnalytics.name, schema: CampaignAnalyticsSchema },
      {
        name: CustomerProductAffinity.name,
        schema: CustomerProductAffinitySchema,
      },
    ]),
    ProductAffinityModule, // Import to use ProductAffinityService
    NotificationsModule, // Import to send campaign messages
    CustomersModule, // Import to get customer contact info
  ],
  controllers: [ProductCampaignController],
  providers: [ProductCampaignService, CampaignAnalyticsService],
  exports: [ProductCampaignService, CampaignAnalyticsService],
})
export class ProductCampaignModule {}
