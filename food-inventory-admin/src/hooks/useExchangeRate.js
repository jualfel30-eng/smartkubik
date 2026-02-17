import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchApi } from '../lib/api';
import { useCountryPlugin } from '../country-plugins/CountryPluginContext';

export function useExchangeRate() {
  const plugin = useCountryPlugin();
  const exchangeRateConfig = plugin.currencyEngine.getExchangeRateConfig();

  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const rateLimitedRef = useRef(false);

  const fetchRate = useCallback(async () => {
    // If no exchange rate config, this country uses a single currency
    if (!exchangeRateConfig) {
      setRate(1);
      setLoading(false);
      return;
    }

    // Stop retrying if we hit a rate limit
    if (rateLimitedRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(exchangeRateConfig.endpoint);
      setRate(response.rate);
      setLastUpdate(new Date(response.lastUpdate));
      rateLimitedRef.current = false;
    } catch (err) {
      const is429 = err?.message?.includes('429') || err?.message?.includes('Too many');
      if (is429) {
        rateLimitedRef.current = true;
        // Auto-reset after 5 minutes to allow retry
        setTimeout(() => { rateLimitedRef.current = false; }, 5 * 60 * 1000);
      }
      console.error('Error fetching exchange rate:', err);
      setError('No se pudo obtener la tasa de cambio');
    } finally {
      setLoading(false);
    }
  }, [exchangeRateConfig]);

  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, exchangeRateConfig?.refreshIntervalMs || 3600000);
    return () => clearInterval(interval);
  }, [fetchRate]);

  return { rate, loading, error, lastUpdate, refetch: fetchRate };
}
