import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';

export function useExchangeRate() {
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchRate = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/exchange-rate/bcv');
      setRate(response.rate);
      setLastUpdate(new Date(response.lastUpdate));
    } catch (err) {
      console.error('Error fetching exchange rate:', err);
      setError('No se pudo obtener la tasa de cambio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
    // Actualizar cada hora
    const interval = setInterval(fetchRate, 3600000);
    return () => clearInterval(interval);
  }, []);

  return { rate, loading, error, lastUpdate, refetch: fetchRate };
}