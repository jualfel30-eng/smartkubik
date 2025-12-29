import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { PlaybooksService } from "./playbooks.service";
import { PlaybooksController } from "./playbooks.controller";
import {
  Playbook,
  PlaybookSchema,
  PlaybookExecution,
  PlaybookExecutionSchema,
} from "../../schemas/playbook.schema";
import { Opportunity, OpportunitySchema } from "../../schemas/opportunity.schema";
import { ActivitiesModule } from "../activities/activities.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PlaybookExecutionJob } from "../../jobs/playbook-execution.job";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Playbook.name, schema: PlaybookSchema },
      { name: PlaybookExecution.name, schema: PlaybookExecutionSchema },
      { name: Opportunity.name, schema: OpportunitySchema },
    ]),
    forwardRef(() => ActivitiesModule),
    NotificationsModule,
  ],
  controllers: [PlaybooksController],
  providers: [PlaybooksService, PlaybookExecutionJob],
  exports: [PlaybooksService],
})
export class PlaybooksModule {}
