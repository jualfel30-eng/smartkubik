import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export const useBillOfMaterials = () => {
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadBoms = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const queryString = new URLSearchParams(params).toString();
      const url = `/bill-of-materials${queryString ? `?${queryString}` : ''}`;
      const response = await fetchApi(url);
      setBoms(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      setBoms([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBom = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/bill-of-materials/${id}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBomByProduct = useCallback(async (productId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/bill-of-materials/by-product/${productId}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createBom = async (bomData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/bill-of-materials', {
        method: 'POST',
        body: JSON.stringify(bomData),
      });
      await loadBoms();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateBom = async (id, bomData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/bill-of-materials/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(bomData),
      });
      await loadBoms();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteBom = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await fetchApi(`/bill-of-materials/${id}`, { method: 'DELETE' });
      setBoms(prev => prev.filter(b => b._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCost = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/bill-of-materials/${id}/total-cost`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAvailability = useCallback(async (id, quantity) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/bill-of-materials/${id}/check-availability?quantity=${quantity}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    boms,
    loading,
    error,
    loadBoms,
    getBom,
    getBomByProduct,
    createBom,
    updateBom,
    deleteBom,
    calculateTotalCost,
    checkAvailability,
  };
};
