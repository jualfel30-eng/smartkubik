
import { Module } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { OpenaiModule } from '../openai/openai.module';
import { VectorDbModule } from '../vector-db/vector-db.module';
import { KnowledgeBaseController } from './knowledge-base.controller';

@Module({
  imports: [OpenaiModule, VectorDbModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
