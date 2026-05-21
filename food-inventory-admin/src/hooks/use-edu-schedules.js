import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export function useEduSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(filters).toString();
      const res = await fetchApi(`/education/schedules${qs ? `?${qs}` : ''}`);
      const list = res?.data ?? res;
      setSchedules(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (data) => {
    const res = await fetchApi('/education/schedules', { method: 'POST', body: JSON.stringify(data) });
    return res?.data ?? res;
  }, []);

  const update = useCallback(async (id, data) => {
    const res = await fetchApi(`/education/schedules/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    return res?.data ?? res;
  }, []);

  const remove = useCallback(async (id) => {
    await fetchApi(`/education/schedules/${id}`, { method: 'DELETE' });
  }, []);

  return { schedules, loading, error, load, create, update, remove };
}
