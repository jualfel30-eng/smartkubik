import { useCallback, useMemo, useState } from 'react';
import { fetchApi } from '../lib/api';
import {
  UnitType,
  CreateUnitTypeDto,
  UpdateUnitTypeDto,
  UnitTypeQueryParams,
  ConvertUnitsDto,
  ConvertUnitsResponse,
  UnitCategory,
} from '../types/unit-types';

const extractPayload = (response: any) => response?.data ?? response ?? null;

export function useUnitTypes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * List all unit types with optional filters
   */
  const listUnitTypes = useCallback(async (params?: UnitTypeQueryParams) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);
      if (params?.isSystemDefined !== undefined)
        queryParams.append('isSystemDefined', String(params.isSystemDefined));
      if (params?.tenantId) queryParams.append('tenantId', params.tenantId);
      if (params?.isActive !== undefined)
        queryParams.append('isActive', String(params.isActive));
      if (params?.search) queryParams.append('search', params.search);

      const queryString = queryParams.toString();
      const url = queryString ? `/unit-types?${queryString}` : '/unit-types';

      const response = await fetchApi(url);
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload as UnitType[] };
    } catch (err: any) {
      const message = err?.message ?? 'Error al listar tipos de unidades';
      setError(message);
      return { success: false, error: message, data: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get available categories
   */
  const getCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/unit-types/categories');
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload as UnitCategory[] };
    } catch (err: any) {
      const message = err?.message ?? 'Error al obtener categorías';
      setError(message);
      return { success: false, error: message, data: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get a unit type by ID
   */
  const getUnitType = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await fetchApi(`/unit-types/${id}`);
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload as UnitType };
    } catch (err: any) {
      const message = err?.message ?? 'Error al obtener tipo de unidad';
      setError(message);
      return { success: false, error: message, data: null };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get a unit type by name
   */
  const getUnitTypeByName = useCallback(async (name: string) => {
    try {
      setLoading(true);
      const response = await fetchApi(`/unit-types/by-name/${encodeURIComponent(name)}`);
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload as UnitType };
    } catch (err: any) {
      const message = err?.message ?? 'Error al obtener tipo de unidad por nombre';
      setError(message);
      return { success: false, error: message, data: null };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a custom unit type
   */
  const createUnitType = useCallback(async (data: CreateUnitTypeDto) => {
    try {
      setLoading(true);
      const response = await fetchApi('/unit-types', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload as UnitType };
    } catch (err: any) {
      const message = err?.message ?? 'Error al crear tipo de unidad';
      setError(message);
      return { success: false, error: message, data: null };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update a unit type
   */
  const updateUnitType = useCallback(async (id: string, data: UpdateUnitTypeDto) => {
    try {
      setLoading(true);
      const response = await fetchApi(`/unit-types/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload as UnitType };
    } catch (err: any) {
      const message = err?.message ?? 'Error al actualizar tipo de unidad';
      setError(message);
      return { success: false, error: message, data: null };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Soft delete a unit type
   */
  const deleteUnitType = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await fetchApi(`/unit-types/${id}`, {
        method: 'DELETE',
      });
      setError(null);
      return { success: true };
    } catch (err: any) {
      const message = err?.message ?? 'Error al eliminar tipo de unidad';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Hard delete a unit type (permanent)
   */
  const hardDeleteUnitType = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await fetchApi(`/unit-types/${id}/hard`, {
        method: 'DELETE',
      });
      setError(null);
      return { success: true };
    } catch (err: any) {
      const message = err?.message ?? 'Error al eliminar permanentemente tipo de unidad';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Convert units using a unit type
   */
  const convertUnits = useCallback(async (data: ConvertUnitsDto) => {
    try {
      setLoading(true);
      const response = await fetchApi('/unit-types/convert', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload as ConvertUnitsResponse };
    } catch (err: any) {
      const message = err?.message ?? 'Error al convertir unidades';
      setError(message);
      return { success: false, error: message, data: null };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get conversion factor between two units
   */
  const getConversionFactor = useCallback(async (
    unitTypeId: string,
    fromUnit: string,
    toUnit: string
  ) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        fromUnit,
        toUnit,
      });
      const response = await fetchApi(
        `/unit-types/${unitTypeId}/conversion-factor?${queryParams.toString()}`
      );
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload.factor as number };
    } catch (err: any) {
      const message = err?.message ?? 'Error al obtener factor de conversión';
      setError(message);
      return { success: false, error: message, data: null };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Validate if a unit exists in a unit type
   */
  const validateUnit = useCallback(async (unitTypeId: string, unit: string) => {
    try {
      setLoading(true);
      const response = await fetchApi(
        `/unit-types/${unitTypeId}/validate-unit/${encodeURIComponent(unit)}`
      );
      const payload = extractPayload(response);
      setError(null);
      return { success: true, data: payload.isValid as boolean };
    } catch (err: any) {
      const message = err?.message ?? 'Error al validar unidad';
      setError(message);
      return { success: false, error: message, data: false };
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(
    () => ({
      loading,
      error,
      // CRUD operations
      listUnitTypes,
      getCategories,
      getUnitType,
      getUnitTypeByName,
      createUnitType,
      updateUnitType,
      deleteUnitType,
      hardDeleteUnitType,
      // Conversion operations
      convertUnits,
      getConversionFactor,
      validateUnit,
    }),
    [
      loading,
      error,
      listUnitTypes,
      getCategories,
      getUnitType,
      getUnitTypeByName,
      createUnitType,
      updateUnitType,
      deleteUnitType,
      hardDeleteUnitType,
      convertUnits,
      getConversionFactor,
      validateUnit,
    ]
  );
}
