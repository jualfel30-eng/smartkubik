import { useState } from 'react';
import { fetchApi } from '../lib/api';
import {
  SupplyConfig,
  CreateSupplyConfigDto,
  UpdateSupplyConfigDto,
  SupplyConsumptionLog,
  LogSupplyConsumptionDto,
} from '../types/consumables';

const extractPayload = (response: any) => response?.data ?? response ?? null;

export function useSupplies() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================== Supply Configs ====================

  /**
   * Create a supply configuration for a product
   */
  const createSupplyConfig = async (data: CreateSupplyConfigDto) => {
    try {
      setLoading(true);
      const response = await fetchApi('/supplies/configs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al crear configuración de suministro';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update a supply configuration
   */
  const updateSupplyConfig = async (
    configId: string,
    data: UpdateSupplyConfigDto
  ) => {
    try {
      setLoading(true);
      const response = await fetchApi(`/supplies/configs/${configId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al actualizar configuración de suministro';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * List all supply configurations with optional filters
   */
  const listSupplyConfigs = async (filters?: {
    supplyCategory?: string;
    isActive?: boolean;
    limit?: number;
    page?: number;
  }) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters?.supplyCategory) queryParams.append('supplyCategory', filters.supplyCategory);
      if (filters?.isActive !== undefined) queryParams.append('isActive', String(filters.isActive));
      if (filters?.limit) queryParams.append('limit', String(filters.limit));
      if (filters?.page) queryParams.append('page', String(filters.page));

      const queryString = queryParams.toString();
      const url = queryString ? `/supplies/configs?${queryString}` : '/supplies/configs';

      const response = await fetchApi(url);
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al listar configuraciones de suministros';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get supply configuration by product ID
   */
  const getSupplyConfigByProduct = async (productId: string) => {
    try {
      setLoading(true);
      const response = await fetchApi(`/supplies/configs/product/${productId}`);
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al obtener configuración de suministro';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // ==================== Supply Consumption ====================

  /**
   * Log supply consumption
   */
  const logConsumption = async (data: LogSupplyConsumptionDto) => {
    try {
      setLoading(true);
      const response = await fetchApi('/supplies/consumption', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al registrar consumo de suministro';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get consumption logs for a specific supply
   */
  const getConsumptionLogs = async (
    supplyId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      page?: number;
    }
  ) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.limit) queryParams.append('limit', String(filters.limit));
      if (filters?.page) queryParams.append('page', String(filters.page));

      const queryString = queryParams.toString();
      const url = queryString
        ? `/supplies/consumption/${supplyId}?${queryString}`
        : `/supplies/consumption/${supplyId}`;

      const response = await fetchApi(url);
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al obtener logs de consumo';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // ==================== Reports ====================

  /**
   * Get consumption report by department
   */
  const getConsumptionReportByDepartment = async (
    startDate?: string,
    endDate?: string
  ) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const queryString = queryParams.toString();
      const url = queryString
        ? `/supplies/reports/by-department?${queryString}`
        : '/supplies/reports/by-department';

      const response = await fetchApi(url);
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al obtener reporte por departamento';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get consumption report by supply
   */
  const getConsumptionReportBySupply = async (
    startDate?: string,
    endDate?: string
  ) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const queryString = queryParams.toString();
      const url = queryString
        ? `/supplies/reports/by-supply?${queryString}`
        : '/supplies/reports/by-supply';

      const response = await fetchApi(url);
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al obtener reporte por suministro';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    // Supply configs
    createSupplyConfig,
    updateSupplyConfig,
    listSupplyConfigs,
    getSupplyConfigByProduct,
    // Consumption logging
    logConsumption,
    getConsumptionLogs,
    // Reports
    getConsumptionReportByDepartment,
    getConsumptionReportBySupply,
  };
}
