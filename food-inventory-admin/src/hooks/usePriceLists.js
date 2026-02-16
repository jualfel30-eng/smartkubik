import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

/**
 * Hook para gestionar listas de precios
 */
export function usePriceLists() {
  const [priceLists, setPriceLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Carga todas las listas de precios
   */
  const loadPriceLists = useCallback(async (activeOnly = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi(`/price-lists?activeOnly=${activeOnly}`);
      setPriceLists(response.data || []);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error al cargar listas de precios');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crea una nueva lista de precios
   */
  const createPriceList = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi('/price-lists', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await loadPriceLists();
      return response.data;
    } catch (err) {
      setError(err.message || 'Error al crear lista de precios');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadPriceLists]);

  /**
   * Actualiza una lista de precios
   */
  const updatePriceList = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi(`/price-lists/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      await loadPriceLists();
      return response.data;
    } catch (err) {
      setError(err.message || 'Error al actualizar lista de precios');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadPriceLists]);

  /**
   * Elimina una lista de precios
   */
  const deletePriceList = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi(`/price-lists/${id}`, {
        method: 'DELETE',
      });
      await loadPriceLists();
    } catch (err) {
      setError(err.message || 'Error al eliminar lista de precios');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadPriceLists]);

  /**
   * Asigna un producto a una lista de precios
   */
  const assignProduct = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi('/price-lists/assign-product', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (err) {
      setError(err.message || 'Error al asignar producto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Asignación masiva de productos
   */
  const bulkAssignProducts = useCallback(async (priceListId, products) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi('/price-lists/bulk-assign', {
        method: 'POST',
        body: JSON.stringify({ priceListId, products }),
      });
      return response.data;
    } catch (err) {
      setError(err.message || 'Error en asignación masiva');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtiene todas las listas de precios de un producto
   */
  const getProductPriceLists = useCallback(async (productId, variantSku) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi(`/price-lists/product/${productId}/variant/${variantSku}`);
      return response.data || [];
    } catch (err) {
      setError(err.message || 'Error al cargar precios del producto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Elimina un producto de una lista de precios
   */
  const removeProductFromPriceList = useCallback(async (priceListId, variantSku) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi(`/price-lists/${priceListId}/product/${variantSku}`, {
        method: 'DELETE',
      });
    } catch (err) {
      setError(err.message || 'Error al eliminar producto de la lista');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    priceLists,
    loading,
    error,
    loadPriceLists,
    createPriceList,
    updatePriceList,
    deletePriceList,
    assignProduct,
    bulkAssignProducts,
    getProductPriceLists,
    removeProductFromPriceList,
  };
}
