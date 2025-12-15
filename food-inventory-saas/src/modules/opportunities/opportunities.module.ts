import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OpportunitiesService } from "./opportunities.service";
import { OpportunitiesController } from "./opportunities.controller";
import {
  Opportunity,
  OpportunitySchema,
} from "../../schemas/opportunity.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { NotificationsModule } from "../notifications/notifications.module";
import {
  OpportunityStageDefinition,
  OpportunityStageDefinitionSchema,
} from "../../schemas/opportunity-stage.schema";
import {
  MessageActivity,
  MessageActivitySchema,
} from "../../schemas/message-activity.schema";
import { PlaybooksModule } from "../playbooks/playbooks.module";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Opportunity.name, schema: OpportunitySchema },
      { name: Customer.name, schema: CustomerSchema },
      {
        name: OpportunityStageDefinition.name,
        schema: OpportunityStageDefinitionSchema,
      },
      { name: MessageActivity.name, schema: MessageActivitySchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    NotificationsModule,
    PlaybooksModule,
  ],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
