import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export function useEduDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/education/dashboard');
      setSummary(res?.data ?? res ?? null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { summary, loading, error, load };
}
