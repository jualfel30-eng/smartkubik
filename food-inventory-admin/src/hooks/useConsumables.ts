import { useState } from 'react';
import { fetchApi } from '../lib/api';
import {
  ConsumableConfig,
  CreateConsumableConfigDto,
  UpdateConsumableConfigDto,
  ProductConsumableRelation,
  CreateProductConsumableRelationDto,
  UpdateProductConsumableRelationDto,
} from '../types/consumables';

const extractPayload = (response: any) => response?.data ?? response ?? null;

export function useConsumables() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================== Consumable Configs ====================

  /**
   * Create a consumable configuration for a product
   */
  const createConsumableConfig = async (data: CreateConsumableConfigDto) => {
    try {
      setLoading(true);
      const response = await fetchApi('/consumables/configs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al crear configuración de consumible';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update a consumable configuration
   */
  const updateConsumableConfig = async (
    configId: string,
    data: UpdateConsumableConfigDto
  ) => {
    try {
      setLoading(true);
      const response = await fetchApi(`/consumables/configs/${configId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al actualizar configuración de consumible';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * List all consumable configurations with optional filters
   */
  const listConsumableConfigs = async (filters?: {
    consumableType?: string;
    isActive?: boolean;
    limit?: number;
    page?: number;
  }) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters?.consumableType) queryParams.append('consumableType', filters.consumableType);
      if (filters?.isActive !== undefined) queryParams.append('isActive', String(filters.isActive));
      if (filters?.limit) queryParams.append('limit', String(filters.limit));
      if (filters?.page) queryParams.append('page', String(filters.page));

      const queryString = queryParams.toString();
      const url = queryString ? `/consumables/configs?${queryString}` : '/consumables/configs';

      const response = await fetchApi(url);
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al listar configuraciones de consumibles';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get consumable configuration by product ID
   */
  const getConsumableConfigByProduct = async (productId: string) => {
    try {
      setLoading(true);
      const response = await fetchApi(`/consumables/configs/product/${productId}`);
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al obtener configuración de consumible';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // ==================== Product-Consumable Relations ====================

  /**
   * Create a relation between a product and a consumable
   */
  const createProductConsumableRelation = async (
    data: CreateProductConsumableRelationDto
  ) => {
    try {
      setLoading(true);
      const response = await fetchApi('/consumables/relations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al crear relación producto-consumible';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get all consumables for a specific product
   */
  const getProductConsumables = async (productId: string) => {
    try {
      setLoading(true);
      const response = await fetchApi(`/consumables/relations/product/${productId}`);
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al obtener consumibles del producto';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get all products that use a specific consumable
   */
  const getProductsUsingConsumable = async (consumableId: string) => {
    try {
      setLoading(true);
      const response = await fetchApi(`/consumables/relations/consumable/${consumableId}`);
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al obtener productos que usan el consumible';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update a product-consumable relation
   */
  const updateProductConsumableRelation = async (
    relationId: string,
    data: UpdateProductConsumableRelationDto
  ) => {
    try {
      setLoading(true);
      const response = await fetchApi(`/consumables/relations/${relationId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al actualizar relación producto-consumible';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a product-consumable relation
   */
  const deleteProductConsumableRelation = async (relationId: string) => {
    try {
      setLoading(true);
      await fetchApi(`/consumables/relations/${relationId}`, {
        method: 'DELETE',
      });
      setError(null);
      return { success: true };
    } catch (err: any) {
      const message = err?.message ?? 'Error al eliminar relación producto-consumible';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    // Consumable configs
    createConsumableConfig,
    updateConsumableConfig,
    listConsumableConfigs,
    getConsumableConfigByProduct,
    // Product-consumable relations
    createProductConsumableRelation,
    getProductConsumables,
    getProductsUsingConsumable,
    updateProductConsumableRelation,
    deleteProductConsumableRelation,
  };
}
