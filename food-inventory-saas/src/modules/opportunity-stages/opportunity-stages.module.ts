import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OpportunityStagesService } from "./opportunity-stages.service";
import { OpportunityStagesController } from "./opportunity-stages.controller";
import {
  OpportunityStageDefinition,
  OpportunityStageDefinitionSchema,
} from "../../schemas/opportunity-stage.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: OpportunityStageDefinition.name,
        schema: OpportunityStageDefinitionSchema,
      },
    ]),
  ],
  controllers: [OpportunityStagesController],
  providers: [OpportunityStagesService],
  exports: [OpportunityStagesService],
})
export class OpportunityStagesModule {}
