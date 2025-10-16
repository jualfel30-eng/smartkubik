import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssistantGateway } from './assistant.gateway';
import { AssistantService } from './assistant.service';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { OpenaiModule } from '../openai/openai.module';
import { AssistantController } from './assistant.controller';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';

@Module({
  imports: [
    KnowledgeBaseModule,
    OpenaiModule,
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  providers: [AssistantGateway, AssistantService],
  controllers: [AssistantController],
  exports: [AssistantService],
})
export class AssistantModule {}
