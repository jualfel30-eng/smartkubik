import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '../hooks/use-auth.jsx';
import { resolvePlugin } from './registry';

const CountryPluginContext = createContext(null);

export function CountryPluginProvider({ children }) {
  const { tenant } = useAuth();

  const plugin = useMemo(
    () => resolvePlugin(tenant?.countryCode || 'VE'),
    [tenant?.countryCode],
  );

  return (
    <CountryPluginContext.Provider value={plugin}>
      {children}
    </CountryPluginContext.Provider>
  );
}

export function useCountryPlugin() {
  const ctx = useContext(CountryPluginContext);
  if (!ctx) {
    throw new Error('useCountryPlugin must be used inside CountryPluginProvider');
  }
  return ctx;
}
