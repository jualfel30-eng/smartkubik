import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export const useProductionVersions = () => {
  const [productionVersions, setProductionVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProductionVersions = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const queryString = new URLSearchParams(params).toString();
      const url = `/production-versions${queryString ? `?${queryString}` : ''}`;
      const response = await fetchApi(url);
      setProductionVersions(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      setProductionVersions([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProductionVersion = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/production-versions/${id}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDefaultVersion = useCallback(async (productId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/production-versions/by-product/${productId}/default`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createProductionVersion = async (versionData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/production-versions', {
        method: 'POST',
        body: JSON.stringify(versionData),
      });
      await loadProductionVersions();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProductionVersion = async (id, versionData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/production-versions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(versionData),
      });
      await loadProductionVersions();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteProductionVersion = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await fetchApi(`/production-versions/${id}`, { method: 'DELETE' });
      setProductionVersions(prev => prev.filter(pv => pv._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    productionVersions,
    loading,
    error,
    loadProductionVersions,
    getProductionVersion,
    getDefaultVersion,
    createProductionVersion,
    updateProductionVersion,
    deleteProductionVersion,
  };
};
