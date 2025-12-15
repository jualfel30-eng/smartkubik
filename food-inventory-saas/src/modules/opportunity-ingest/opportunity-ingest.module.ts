import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OpportunityIngestController } from "./opportunity-ingest.controller";
import { CalendarWebhookController } from "./calendar-webhook.controller";
import { OpportunitiesModule } from "../opportunities/opportunities.module";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { IngestEvent, IngestEventSchema } from "../../schemas/ingest-event.schema";

@Module({
  imports: [
    OpportunitiesModule,
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: IngestEvent.name, schema: IngestEventSchema },
    ]),
  ],
  controllers: [OpportunityIngestController, CalendarWebhookController],
})
export class OpportunityIngestModule {}
