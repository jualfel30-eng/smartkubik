import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export function useEduGrades() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(filters).toString();
      const res = await fetchApi(`/education/grades${qs ? `?${qs}` : ''}`);
      const list = res?.data ?? res;
      setGrades(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (data) => {
    const res = await fetchApi('/education/grades', { method: 'POST', body: JSON.stringify(data) });
    return res?.data ?? res;
  }, []);

  const update = useCallback(async (id, data) => {
    const res = await fetchApi(`/education/grades/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    return res?.data ?? res;
  }, []);

  const publish = useCallback(async (payload) => {
    const res = await fetchApi('/education/grades/publish', { method: 'POST', body: JSON.stringify(payload) });
    return res?.data ?? res;
  }, []);

  return { grades, loading, error, load, save, update, publish };
}
