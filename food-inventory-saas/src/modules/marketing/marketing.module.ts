import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MarketingController } from "./marketing.controller";
import { MarketingService } from "./marketing.service";
import { MarketingTriggerController } from "./marketing-trigger.controller";
import { MarketingTriggerService } from "./marketing-trigger.service";
import { EventListenerService } from "./event-listener.service";
import { ABTestingController } from "./ab-testing.controller";
import { ABTestingService } from "./ab-testing.service";
import { SchedulingController } from "./scheduling.controller";
import { SchedulingService } from "./scheduling.service";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";
import {
  MarketingCampaign,
  MarketingCampaignSchema,
} from "../../schemas/marketing-campaign.schema";
import {
  MarketingTrigger,
  MarketingTriggerSchema,
} from "../../schemas/marketing-trigger.schema";
import {
  TriggerExecutionLog,
  TriggerExecutionLogSchema,
} from "../../schemas/trigger-execution-log.schema";
import {
  CampaignVariant,
  CampaignVariantSchema,
} from "../../schemas/campaign-variant.schema";
import {
  CampaignSchedule,
  CampaignScheduleSchema,
} from "../../schemas/campaign-schedule.schema";
import {
  MarketingWorkflow,
  MarketingWorkflowSchema,
} from "../../schemas/marketing-workflow.schema";
import {
  WorkflowExecution,
  WorkflowExecutionSchema,
} from "../../schemas/workflow-execution.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";

// === PHASE 3: Product Campaign Integration ===
import { ProductCampaignController } from "../../controllers/product-campaign.controller";
import { ProductCampaignService } from "../../services/product-campaign.service";
import {
  ProductCampaign,
  ProductCampaignSchema,
} from "../../schemas/product-campaign.schema";
import {
  CustomerProductAffinity,
  CustomerProductAffinitySchema,
} from "../../schemas/customer-product-affinity.schema";
import { ProductAffinityModule } from "../product-affinity/product-affinity.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarketingCampaign.name, schema: MarketingCampaignSchema },
      { name: MarketingTrigger.name, schema: MarketingTriggerSchema },
      { name: TriggerExecutionLog.name, schema: TriggerExecutionLogSchema },
      { name: CampaignVariant.name, schema: CampaignVariantSchema },
      { name: CampaignSchedule.name, schema: CampaignScheduleSchema },
      { name: MarketingWorkflow.name, schema: MarketingWorkflowSchema },
      { name: WorkflowExecution.name, schema: WorkflowExecutionSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Order.name, schema: OrderSchema },
      // PHASE 3: Product Campaign schemas
      { name: ProductCampaign.name, schema: ProductCampaignSchema },
      {
        name: CustomerProductAffinity.name,
        schema: CustomerProductAffinitySchema,
      },
    ]),
    // PHASE 3: Import ProductAffinityModule for CRM data access
    ProductAffinityModule,
    // PHASE 3: Import NotificationsModule for campaign sending
    NotificationsModule,
  ],
  controllers: [
    MarketingController,
    MarketingTriggerController,
    ABTestingController,
    SchedulingController,
    WorkflowController,
    // PHASE 3: Product Campaign controller
    ProductCampaignController,
  ],
  providers: [
    MarketingService,
    MarketingTriggerService,
    EventListenerService,
    ABTestingService,
    SchedulingService,
    WorkflowService,
    // PHASE 3: Product Campaign service
    ProductCampaignService,
  ],
  exports: [
    MarketingService,
    MarketingTriggerService,
    EventListenerService,
    ABTestingService,
    SchedulingService,
    WorkflowService,
    // PHASE 3: Export ProductCampaignService for external use
    ProductCampaignService,
  ],
})
export class MarketingModule {}
