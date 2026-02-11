import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from './use-auth';

export function useExchangeRate() {
  const { tenant } = useAuth();
  const tenantCurrency = tenant?.currency || 'USD';

  const [rate, setRate] = useState(null);
  const [rates, setRates] = useState(null); // { usd: {...}, eur: {...} }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchRate = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/exchange-rate/bcv');

      // New dual response: { rate, lastUpdate, source, usd: {...}, eur: {...} }
      if (response.usd && response.eur) {
        setRates({ usd: response.usd, eur: response.eur });
        const selected = tenantCurrency === 'EUR' ? response.eur : response.usd;
        setRate(selected.rate);
        setLastUpdate(new Date(selected.lastUpdate));
      } else {
        // Backward compat: old response shape { rate, lastUpdate, source }
        setRate(response.rate);
        setLastUpdate(new Date(response.lastUpdate));
      }
    } catch (err) {
      console.error('Error fetching exchange rate:', err);
      setError('No se pudo obtener la tasa de cambio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, 3600000);
    return () => clearInterval(interval);
  }, [tenantCurrency]);

  return { rate, rates, loading, error, lastUpdate, tenantCurrency, refetch: fetchRate };
}
