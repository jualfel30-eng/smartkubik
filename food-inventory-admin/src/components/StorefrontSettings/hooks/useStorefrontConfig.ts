import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface StorefrontConfig {
  _id: string;
  tenantId: string;
  domain: string;
  isActive: boolean;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
    favicon?: string;
  };
  templateType: string;
  customCSS?: string;
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  socialMedia: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    twitter?: string;
    linkedin?: string;
  };
  contactInfo: {
    email: string;
    phone: string;
    address?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
}

export function useStorefrontConfig() {
  const [config, setConfig] = useState<StorefrontConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Obtener token JWT del localStorage
  const getAuthToken = () => localStorage.getItem('token');

  // GET: Obtener configuración actual
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/storefront`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data.data || response.data);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setConfig(null); // No existe config, mostrar formulario de creación
      } else {
        setError(err.response?.data?.message || 'Error al cargar configuración');
      }
    } finally {
      setLoading(false);
    }
  };

  // POST: Crear nueva configuración
  const createConfig = async (data: Partial<StorefrontConfig>) => {
    try {
      setSaving(true);
      const token = getAuthToken();
      const response = await axios.post(`${API_BASE_URL}/storefront`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data.data || response.data);
      setError(null);
      return { success: true, data: response.data.data || response.data };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al crear configuración';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setSaving(false);
    }
  };

  // PATCH: Actualizar parcialmente
  const updateConfig = async (data: Partial<StorefrontConfig>) => {
    try {
      setSaving(true);
      const token = getAuthToken();
      const response = await axios.patch(`${API_BASE_URL}/storefront`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data.data || response.data);
      setError(null);
      return { success: true, data: response.data.data || response.data };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al actualizar configuración';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setSaving(false);
    }
  };

  // PUT: Reemplazo completo
  const replaceConfig = async (data: Partial<StorefrontConfig>) => {
    try {
      setSaving(true);
      const token = getAuthToken();
      const response = await axios.put(`${API_BASE_URL}/storefront`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data.data || response.data);
      setError(null);
      return { success: true, data: response.data.data || response.data };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al reemplazar configuración';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setSaving(false);
    }
  };

  // DELETE: Eliminar configuración
  const deleteConfig = async () => {
    try {
      setSaving(true);
      const token = getAuthToken();
      await axios.delete(`${API_BASE_URL}/storefront`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(null);
      setError(null);
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al eliminar configuración';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setSaving(false);
    }
  };

  // POST: Resetear a valores por defecto
  const resetConfig = async () => {
    try {
      setSaving(true);
      const token = getAuthToken();
      const response = await axios.post(`${API_BASE_URL}/storefront/reset`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data.data || response.data);
      setError(null);
      return { success: true, data: response.data.data || response.data };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al resetear configuración';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    loading,
    error,
    saving,
    fetchConfig,
    createConfig,
    updateConfig,
    replaceConfig,
    deleteConfig,
    resetConfig
  };
}
