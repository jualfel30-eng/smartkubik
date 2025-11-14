import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export const useWorkCenters = () => {
  const [workCenters, setWorkCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadWorkCenters = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const queryString = new URLSearchParams(params).toString();
      const url = `/work-centers${queryString ? `?${queryString}` : ''}`;
      const response = await fetchApi(url);
      setWorkCenters(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      setWorkCenters([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkCenter = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/work-centers/${id}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkCenter = async (workCenterData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/work-centers', {
        method: 'POST',
        body: JSON.stringify(workCenterData),
      });
      await loadWorkCenters();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateWorkCenter = async (id, workCenterData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/work-centers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(workCenterData),
      });
      await loadWorkCenters();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkCenter = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await fetchApi(`/work-centers/${id}`, { method: 'DELETE' });
      setWorkCenters(prev => prev.filter(wc => wc._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    workCenters,
    loading,
    error,
    loadWorkCenters,
    getWorkCenter,
    createWorkCenter,
    updateWorkCenter,
    deleteWorkCenter,
  };
};
