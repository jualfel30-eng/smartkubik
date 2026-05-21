import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export function useEduAttendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(filters).toString();
      const res = await fetchApi(`/education/attendance${qs ? `?${qs}` : ''}`);
      const list = res?.data ?? res;
      setRecords(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveBatch = useCallback(async (payload) => {
    const res = await fetchApi('/education/attendance/batch', { method: 'POST', body: JSON.stringify(payload) });
    return res?.data ?? res;
  }, []);

  return { records, loading, error, load, saveBatch };
}
