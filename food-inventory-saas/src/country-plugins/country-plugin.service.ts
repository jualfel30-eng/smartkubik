import { Injectable } from '@nestjs/common';
import { CountryPlugin } from './interfaces';
import { COUNTRY_PLUGINS } from './registry';

@Injectable()
export class CountryPluginService {
  resolve(countryCode: string): CountryPlugin {
    const plugin = COUNTRY_PLUGINS[countryCode];
    if (!plugin) {
      throw new Error(`No plugin registered for country: ${countryCode}`);
    }
    return plugin;
  }

  getAvailableCountries(): { code: string; name: string }[] {
    return Object.values(COUNTRY_PLUGINS).map((p) => ({
      code: p.countryCode,
      name: p.countryName,
    }));
  }

  hasPlugin(countryCode: string): boolean {
    return countryCode in COUNTRY_PLUGINS;
  }
}
