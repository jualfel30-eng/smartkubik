import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StorefrontConfigController } from './storefront-config.controller';
import { StorefrontConfigService } from './storefront-config.service';
import {
  StorefrontConfig,
  StorefrontConfigSchema,
} from '../../schemas/storefront-config.schema';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: StorefrontConfig.name, schema: StorefrontConfigSchema },
    ]),
  ],
  controllers: [StorefrontConfigController],
  providers: [StorefrontConfigService],
  exports: [StorefrontConfigService],
})
export class StorefrontConfigModule {}
