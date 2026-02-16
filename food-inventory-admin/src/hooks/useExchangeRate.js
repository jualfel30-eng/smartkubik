import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../lib/api';
import { useCountryPlugin } from '../country-plugins/CountryPluginContext';

export function useExchangeRate() {
  const plugin = useCountryPlugin();
  const exchangeRateConfig = plugin.currencyEngine.getExchangeRateConfig();

  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchRate = useCallback(async () => {
    // If no exchange rate config, this country uses a single currency
    if (!exchangeRateConfig) {
      setRate(1);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(exchangeRateConfig.endpoint);
      setRate(response.rate);
      setLastUpdate(new Date(response.lastUpdate));
    } catch (err) {
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
