import { CountryPlugin } from './interfaces';
import { VenezuelaPlugin } from './plugins/venezuela/ve-plugin';

export const COUNTRY_PLUGINS: Record<string, CountryPlugin> = {
  VE: new VenezuelaPlugin(),
};

export function getAvailableCountries(): { code: string; name: string }[] {
  return Object.values(COUNTRY_PLUGINS).map((p) => ({
    code: p.countryCode,
    name: p.countryName,
  }));
}
