import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export const useRoutings = () => {
  const [routings, setRoutings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRoutings = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const queryString = new URLSearchParams(params).toString();
      const url = `/routings${queryString ? `?${queryString}` : ''}`;
      const response = await fetchApi(url);
      setRoutings(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      setRoutings([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRouting = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/routings/${id}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRouting = async (routingData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/routings', {
        method: 'POST',
        body: JSON.stringify(routingData),
      });
      await loadRoutings();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateRouting = async (id, routingData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/routings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(routingData),
      });
      await loadRoutings();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteRouting = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await fetchApi(`/routings/${id}`, { method: 'DELETE' });
      setRoutings(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    routings,
    loading,
    error,
    loadRoutings,
    getRouting,
    createRouting,
    updateRouting,
    deleteRouting,
  };
};
