import { venezuelaPlugin } from './plugins/venezuela/index';

const COUNTRY_PLUGINS = {
  VE: venezuelaPlugin,
};

export function resolvePlugin(countryCode) {
  const plugin = COUNTRY_PLUGINS[countryCode];
  if (!plugin) {
    console.warn(`No plugin for country: ${countryCode}, falling back to VE`);
    return COUNTRY_PLUGINS.VE;
  }
  return plugin;
}

export function getAvailableCountries() {
  return Object.values(COUNTRY_PLUGINS).map((p) => ({
    code: p.countryCode,
    name: p.countryName,
  }));
}
