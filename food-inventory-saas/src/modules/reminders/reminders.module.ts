import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { RemindersService } from "./reminders.service";
import { RemindersController } from "./reminders.controller";
import { Reminder, ReminderSchema } from "../../schemas/reminder.schema";
import { Opportunity, OpportunitySchema } from "../../schemas/opportunity.schema";
import { NotificationsModule } from "../notifications/notifications.module";
import { ReminderProcessingJob } from "../../jobs/reminder-processing.job";
import { OpportunityAgingAlertsJob } from "../../jobs/opportunity-aging-alerts.job";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
      { name: Opportunity.name, schema: OpportunitySchema },
    ]),
    NotificationsModule,
  ],
  controllers: [RemindersController],
  providers: [RemindersService, ReminderProcessingJob, OpportunityAgingAlertsJob],
  exports: [RemindersService],
})
export class RemindersModule {}
