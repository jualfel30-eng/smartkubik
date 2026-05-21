import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export function useEduClassrooms(initialFilters = {}) {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (filters = initialFilters) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(filters).toString();
      const res = await fetchApi(`/education/classrooms${qs ? `?${qs}` : ''}`);
      const list = res?.data ?? res;
      setClassrooms(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useCallback(async (data) => {
    const res = await fetchApi('/education/classrooms', { method: 'POST', body: JSON.stringify(data) });
    return res?.data ?? res;
  }, []);

  const update = useCallback(async (id, data) => {
    const res = await fetchApi(`/education/classrooms/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    return res?.data ?? res;
  }, []);

  const remove = useCallback(async (id) => {
    await fetchApi(`/education/classrooms/${id}`, { method: 'DELETE' });
  }, []);

  return { classrooms, loading, error, load, create, update, remove };
}

export function useEduClassroomRoster(classroomId) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!classroomId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi(`/education/classrooms/${classroomId}/students`);
      const list = res?.data ?? res;
      setRoster(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  return { roster, loading, error, load };
}
