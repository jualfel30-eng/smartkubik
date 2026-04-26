import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';

export function useBcvRates(refreshInterval = 3600000) {
  const [usdRate, setUsdRate] = useState(null);
  const [eurRate, setEurRate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBCVRates = async () => {
      try {
        const response = await fetchApi('/exchange-rate/bcv');
        setUsdRate(response.usd?.rate || null);
        setEurRate(response.eur?.rate || null);
      } catch (error) {
        console.error('Error fetching BCV rates:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBCVRates();
    const interval = setInterval(fetchBCVRates, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { usdRate, eurRate, loading };
}
