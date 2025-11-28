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
// Note: ProductCampaignController is in ProductCampaignModule
import { ProductCampaignService } from "../../services/product-campaign.service";
import { CampaignAnalyticsService } from "../../services/campaign-analytics.service";
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
import {
  CampaignAnalytics,
  CampaignAnalyticsSchema,
} from "../../schemas/campaign-analytics.schema";

// === PHASE 7: Email/SMS Templates & Delivery System ===
import { TemplateService } from "./template.service";
import { DeliveryService } from "./delivery.service";
import { TemplateController } from "./template.controller";
import { DeliveryController } from "./delivery.controller";
import {
  EmailTemplate,
  EmailTemplateSchema,
} from "../../schemas/email-template.schema";
import {
  MessageDelivery,
  MessageDeliverySchema,
} from "../../schemas/message-delivery.schema";

// === PHASE 8: WhatsApp Business Integration ===
import { WhatsAppService } from "./whatsapp.service";
import { WhatsAppController } from "./whatsapp.controller";
import {
  WhatsAppTemplate,
  WhatsAppTemplateSchema,
} from "../../schemas/whatsapp-template.schema";
import { SuperAdminModule } from "../super-admin/super-admin.module";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";

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
      // PHASE 5: Campaign Analytics schema
      { name: CampaignAnalytics.name, schema: CampaignAnalyticsSchema },
      // PHASE 7: Email/SMS Templates & Delivery System schemas
      { name: EmailTemplate.name, schema: EmailTemplateSchema },
      { name: MessageDelivery.name, schema: MessageDeliverySchema },
      // PHASE 8: WhatsApp Business Integration schemas
      { name: WhatsAppTemplate.name, schema: WhatsAppTemplateSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    // PHASE 3: Import ProductAffinityModule for CRM data access
    ProductAffinityModule,
    // PHASE 3: Import NotificationsModule for campaign sending
    NotificationsModule,
    // PHASE 8: Import SuperAdminModule for Whapi token access
    SuperAdminModule,
  ],
  controllers: [
    MarketingController,
    MarketingTriggerController,
    ABTestingController,
    SchedulingController,
    WorkflowController,
    // Note: ProductCampaignController is in ProductCampaignModule
    // PHASE 7: Email/SMS Templates & Delivery System controllers
    TemplateController,
    DeliveryController,
    // PHASE 8: WhatsApp Business Integration controller
    WhatsAppController,
  ],
  providers: [
    MarketingService,
    MarketingTriggerService,
    EventListenerService,
    ABTestingService,
    SchedulingService,
    WorkflowService,
    // PHASE 3: Product Campaign services
    ProductCampaignService,
    CampaignAnalyticsService,
    // PHASE 7: Email/SMS Templates & Delivery System services
    TemplateService,
    DeliveryService,
    // PHASE 8: WhatsApp Business Integration service
    WhatsAppService,
  ],
  exports: [
    MarketingService,
    MarketingTriggerService,
    EventListenerService,
    ABTestingService,
    SchedulingService,
    WorkflowService,
    // PHASE 3: Export Product Campaign services for external use
    ProductCampaignService,
    CampaignAnalyticsService,
    // PHASE 7: Export Template & Delivery services for external use
    TemplateService,
    DeliveryService,
    // PHASE 8: Export WhatsApp service for external use
    WhatsAppService,
  ],
})
export class MarketingModule {}
