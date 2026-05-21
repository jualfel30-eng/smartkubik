import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export function useEduStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(filters).toString();
      const res = await fetchApi(`/education/students${qs ? `?${qs}` : ''}`);
      const list = res?.data ?? res;
      setStudents(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (data) => {
    const res = await fetchApi('/education/students', { method: 'POST', body: JSON.stringify(data) });
    return res?.data ?? res;
  }, []);

  const update = useCallback(async (id, data) => {
    const res = await fetchApi(`/education/students/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    return res?.data ?? res;
  }, []);

  return { students, loading, error, load, create, update };
}
