import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export function useEduTuition() {
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(filters).toString();
      const [feesRes, summRes] = await Promise.allSettled([
        fetchApi(`/education/tuition${qs ? `?${qs}` : ''}`),
        fetchApi('/education/tuition/summary'),
      ]);
      if (feesRes.status === 'fulfilled') {
        const list = feesRes.value?.data ?? feesRes.value;
        setFees(Array.isArray(list) ? list : []);
      }
      if (summRes.status === 'fulfilled') {
        setSummary(summRes.value?.data ?? summRes.value);
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const registerPayment = useCallback(async (feeId, data) => {
    const res = await fetchApi(`/education/tuition/${feeId}/pay`, { method: 'POST', body: JSON.stringify(data) });
    return res?.data ?? res;
  }, []);

  const exempt = useCallback(async (feeId, reason) => {
    const res = await fetchApi(`/education/tuition/${feeId}/exempt`, { method: 'POST', body: JSON.stringify({ reason }) });
    return res?.data ?? res;
  }, []);

  const generateBatch = useCallback(async (payload) => {
    const res = await fetchApi('/education/tuition/generate-batch', { method: 'POST', body: JSON.stringify(payload) });
    return res?.data ?? res;
  }, []);

  return { fees, summary, loading, error, load, registerPayment, exempt, generateBatch };
}
