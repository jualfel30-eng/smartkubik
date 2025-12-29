import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CalendarsController } from "./calendars.controller";
import { CalendarsService } from "./calendars.service";
import { Calendar, CalendarSchema } from "../../schemas/calendar.schema";
import { Event, EventSchema } from "../../schemas/event.schema";
import { MailModule } from "../mail/mail.module";
import { CalendarWatchRenewalJob } from "../../jobs/calendar-watch-renewal.job";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Calendar.name, schema: CalendarSchema },
      { name: Event.name, schema: EventSchema },
    ]),
    forwardRef(() => MailModule), // Para GmailOAuthService
  ],
  controllers: [CalendarsController],
  providers: [CalendarsService, CalendarWatchRenewalJob],
  exports: [CalendarsService],
})
export class CalendarsModule {}
