import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProducts = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const queryString = new URLSearchParams(params).toString();
      const url = `/products${queryString ? `?${queryString}` : ''}`;
      const response = await fetchApi(url);
      setProducts(response.data || []);
      return response;
    } catch (err) {
      setError(err.message);
      setProducts([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProduct = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/products/${id}`);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createProduct = async (productData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi('/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
      await loadProducts();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (id, productData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(productData),
      });
      await loadProducts();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await fetchApi(`/products/${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    products,
    loading,
    error,
    loadProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};
