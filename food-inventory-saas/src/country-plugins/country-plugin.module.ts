import { Global, Module } from '@nestjs/common';
import { CountryPluginService } from './country-plugin.service';

@Global()
@Module({
  providers: [CountryPluginService],
  exports: [CountryPluginService],
})
export class CountryPluginModule {}
