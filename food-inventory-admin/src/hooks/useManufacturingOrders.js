import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export const useManufacturingOrders = () => {
  const [manufacturingOrders, setManufacturingOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadManufacturingOrders = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const queryString = new URLSearchParams(params).toString();
      const url = `/manufacturing-orders${queryString ? `?${queryString}` : ''}`;
      const response = await fetchApi(url);
      setManufacturingOrders(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      setManufacturingOrders([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getManufacturingOrder = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/manufacturing-orders/${id}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createManufacturingOrder = async (orderData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/manufacturing-orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
      await loadManufacturingOrders();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateManufacturingOrder = async (id, orderData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/manufacturing-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(orderData),
      });
      await loadManufacturingOrders();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmManufacturingOrder = async (id, confirmData = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/manufacturing-orders/${id}/confirm`, {
        method: 'POST',
        body: JSON.stringify(confirmData),
      });
      await loadManufacturingOrders();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startManufacturingOrder = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/manufacturing-orders/${id}/start`, {
        method: 'POST',
      });
      await loadManufacturingOrders();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const completeManufacturingOrder = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/manufacturing-orders/${id}/complete`, {
        method: 'POST',
      });
      await loadManufacturingOrders();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelManufacturingOrder = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/manufacturing-orders/${id}/cancel`, {
        method: 'POST',
      });
      await loadManufacturingOrders();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteManufacturingOrder = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await fetchApi(`/manufacturing-orders/${id}`, { method: 'DELETE' });
      setManufacturingOrders(prev => prev.filter(o => o._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    manufacturingOrders,
    loading,
    error,
    loadManufacturingOrders,
    getManufacturingOrder,
    createManufacturingOrder,
    updateManufacturingOrder,
    confirmManufacturingOrder,
    startManufacturingOrder,
    completeManufacturingOrder,
    cancelManufacturingOrder,
    deleteManufacturingOrder,
  };
};
