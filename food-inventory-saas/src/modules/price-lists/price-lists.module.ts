import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PriceList, PriceListSchema } from '../../schemas/price-list.schema';
import {
  ProductPriceList,
  ProductPriceListSchema,
} from '../../schemas/product-price-list.schema';
import { PriceListsService } from './price-lists.service';
import { PriceListsController } from './price-lists.controller';
import { AuthModule } from '../../auth/auth.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    RolesModule,
    MongooseModule.forFeature([
      { name: PriceList.name, schema: PriceListSchema },
      { name: ProductPriceList.name, schema: ProductPriceListSchema },
    ]),
  ],
  controllers: [PriceListsController],
  providers: [PriceListsService],
  exports: [PriceListsService],
})
export class PriceListsModule {}
