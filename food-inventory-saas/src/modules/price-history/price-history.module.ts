import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PriceHistory, PriceHistorySchema } from '../../schemas/price-history.schema';
import { PriceHistoryService } from './price-history.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PriceHistory.name, schema: PriceHistorySchema }]),
  ],
  providers: [PriceHistoryService],
  exports: [PriceHistoryService],
})
export class PriceHistoryModule {}
