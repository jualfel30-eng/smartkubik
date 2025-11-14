import { useState, useCallback } from 'react';
import { fetchApi } from '../lib/api';

/**
 * Hook para gestionar las configuraciones de conversión de unidades
 * Permite crear, actualizar, eliminar y convertir entre diferentes unidades de medida
 */
export const useUnitConversions = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Obtener todas las configuraciones con paginación
   */
  const fetchConfigs = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (params.productId) queryParams.append('productId', params.productId);
      if (params.productSku) queryParams.append('productSku', params.productSku);
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);

      const response = await fetchApi(`/unit-conversions?${queryParams.toString()}`);
      setConfigs(response.data || []);
      setError(null);
      return response;
    } catch (err) {
      setError(err.message || 'Error al obtener configuraciones de unidades');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener configuración por ID de producto
   */
  const getConfigByProductId = useCallback(async (productId) => {
    try {
      const response = await fetchApi(`/unit-conversions/by-product/${productId}`);
      return response.data;
    } catch (err) {
      console.error('Error al obtener configuración por producto:', err);
      return null;
    }
  }, []);

  /**
   * Obtener configuración por ID
   */
  const getConfigById = useCallback(async (id) => {
    try {
      const response = await fetchApi(`/unit-conversions/${id}`);
      return response.data;
    } catch (err) {
      console.error('Error al obtener configuración:', err);
      throw err;
    }
  }, []);

  /**
   * Crear nueva configuración de unidades
   */
  const createConfig = async (configData) => {
    try {
      const response = await fetchApi('/unit-conversions', {
        method: 'POST',
        body: JSON.stringify(configData),
      });
      setConfigs(prevConfigs => [response.data, ...prevConfigs]);
      return response.data;
    } catch (err) {
      console.error('Error al crear configuración:', err);
      throw err;
    }
  };

  /**
   * Actualizar configuración existente
   */
  const updateConfig = async (id, updates) => {
    try {
      const response = await fetchApi(`/unit-conversions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setConfigs(prevConfigs =>
        prevConfigs.map(config => (config._id === id ? response.data : config))
      );
      return response.data;
    } catch (err) {
      console.error('Error al actualizar configuración:', err);
      throw err;
    }
  };

  /**
   * Eliminar configuración
   */
  const deleteConfig = async (id) => {
    try {
      await fetchApi(`/unit-conversions/${id}`, {
        method: 'DELETE',
      });
      setConfigs(prevConfigs => prevConfigs.filter(config => config._id !== id));
    } catch (err) {
      console.error('Error al eliminar configuración:', err);
      throw err;
    }
  };

  /**
   * Convertir un valor entre unidades
   * @param {number} value - Valor a convertir
   * @param {string} fromUnit - Unidad origen
   * @param {string} toUnit - Unidad destino
   * @param {string} productId - ID del producto
   * @returns {Promise<number>} - Valor convertido
   */
  const convertUnit = async (value, fromUnit, toUnit, productId) => {
    try {
      const response = await fetchApi('/unit-conversions/convert', {
        method: 'POST',
        body: JSON.stringify({
          value,
          fromUnit,
          toUnit,
          productId,
        }),
      });
      return response.data.convertedValue;
    } catch (err) {
      console.error('Error al convertir unidades:', err);
      throw err;
    }
  };

  /**
   * Convertir con información detallada
   * Retorna objeto completo con originalValue, originalUnit, convertedValue, convertedUnit
   */
  const convertUnitDetailed = async (value, fromUnit, toUnit, productId) => {
    try {
      const response = await fetchApi('/unit-conversions/convert', {
        method: 'POST',
        body: JSON.stringify({
          value,
          fromUnit,
          toUnit,
          productId,
        }),
      });
      return response.data;
    } catch (err) {
      console.error('Error al convertir unidades:', err);
      throw err;
    }
  };

  return {
    configs,
    loading,
    error,
    fetchConfigs,
    getConfigByProductId,
    getConfigById,
    createConfig,
    updateConfig,
    deleteConfig,
    convertUnit,
    convertUnitDetailed,
    refetch: fetchConfigs,
  };
};
