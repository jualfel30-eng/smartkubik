
import { Module } from '@nestjs/common';
import { VectorDbService } from './vector-db.service';
import { OpenaiModule } from '../openai/openai.module';

@Module({
  imports: [OpenaiModule],
  providers: [VectorDbService],
  exports: [VectorDbService],
})
export class VectorDbModule {}
