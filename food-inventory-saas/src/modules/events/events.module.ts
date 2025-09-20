import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EventsService } from "./events.service";
import { EventsController } from "./events.controller";
import { Event, EventSchema } from "../../schemas/event.schema";
import { AuthModule } from "../../auth/auth.module";
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    AuthModule,
    RolesModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService], // Export EventsService to make it available to other modules
})
export class EventsModule {}
