import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CountryPluginService } from './country-plugin.service';
import { CountryPluginController } from './country-plugin.controller';
import { Tenant, TenantSchema } from '../schemas/tenant.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  controllers: [CountryPluginController],
  providers: [CountryPluginService],
  exports: [CountryPluginService],
})
export class CountryPluginModule {}
